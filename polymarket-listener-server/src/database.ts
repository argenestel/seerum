import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { TradeData } from "./listener";

export interface StoredTrade extends TradeData {
  id: string;
  copied: boolean;
  copied_at?: Date;
  copied_to?: string[];
  created_at: Date;
  updated_at: Date;
}

export interface CopySubscriber {
  id?: string;
  address: string; // Subscriber's address (who wants to copy trades)
  trader_address: string; // Trader's address (who to copy FROM)
  percentage?: number; // Percentage of trade size to copy (1-100, default 100)
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface MonitoredTrader {
  id?: string;
  address: string; // Trader address to monitor
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Supabase database manager
 */
export class Database {
  private supabase: SupabaseClient | null = null;

  async connect(supabaseUrl: string, supabaseKey: string): Promise<void> {
    try {
      console.log("🔌 Connecting to Supabase...");
      console.log(`   URL: ${supabaseUrl.replace(/\/\/[^@]+@/, "//***@")}`); // Hide key in logs
      
      this.supabase = createClient(supabaseUrl, supabaseKey);

      // Test connection
      const { error } = await this.supabase.from("monitored_traders").select("count").limit(1);
      
      if (error && error.code !== "PGRST116") { // PGRST116 = table doesn't exist (we'll create it)
        console.warn("⚠️  Supabase connection test:", error.message);
      }

      // Create tables if they don't exist (via migrations or manually)
      await this.ensureTables();

      console.log("✅ Connected to Supabase");
    } catch (error) {
      console.error("❌ Failed to connect to Supabase");
      console.error("   Error details:", error instanceof Error ? error.message : error);
      
      if (error instanceof Error) {
        if (error.message.includes("timeout") || error.message.includes("TIMEOUT")) {
          console.error("\n💡 Troubleshooting:");
          console.error("   1. Check your internet connection");
          console.error("   2. Verify SUPABASE_URL and SUPABASE_KEY are correct in .env file");
          console.error("   3. Ensure Supabase project is active");
        } else if (error.message.includes("JWT") || error.message.includes("auth")) {
          console.error("\n💡 Troubleshooting:");
          console.error("   1. Verify SUPABASE_KEY (anon/service role key) is correct");
          console.error("   2. Check Supabase project settings");
        }
      }
      
      throw error;
    }
  }

  /**
   * Ensure tables exist (create if needed)
   * Note: In production, use Supabase migrations instead
   */
  private async ensureTables(): Promise<void> {
    if (!this.supabase) return;

    // Note: Table creation should be done via Supabase SQL Editor or migrations
    // This is just a placeholder - actual table creation needs to be done manually
    console.log("ℹ️  Ensure tables exist in Supabase:");
    console.log("   - trades");
    console.log("   - copy_subscribers");
    console.log("   - monitored_traders");
  }

  async disconnect(): Promise<void> {
    // Supabase client doesn't need explicit disconnect
    this.supabase = null;
    console.log("🔌 Disconnected from Supabase");
  }

  /**
   * Store a trade in the database
   */
  async storeTrade(tradeData: TradeData): Promise<StoredTrade> {
    if (!this.supabase) {
      throw new Error("Database not connected");
    }

    const now = new Date();
    
    // Only include fields that exist in the database schema
    // Don't spread tradeData as it might contain fields not in schema (like eventSlug)
    const storedTrade = {
      id: tradeData.id,
      user: tradeData.user,
      market: tradeData.market,
      asset_id: tradeData.asset_id,
      side: tradeData.side,
      size: tradeData.size,
      price: tradeData.price,
      timestamp: tradeData.timestamp,
      copied: false,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    const { data, error } = await this.supabase
      .from("trades")
      .upsert(
        storedTrade,
        {
          onConflict: "id",
        }
      )
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to store trade: ${error.message}`);
    }

    return {
      id: data.id,
      user: data.user,
      market: data.market,
      asset_id: data.asset_id,
      side: data.side,
      size: data.size,
      price: data.price,
      timestamp: data.timestamp,
      copied: data.copied,
      copied_at: data.copied_at,
      copied_to: data.copied_to,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
    };
  }

  /**
   * Check if a trade has been copied
   */
  async isTradeCopied(tradeId: string): Promise<boolean> {
    if (!this.supabase) {
      return false;
    }

    const { data, error } = await this.supabase
      .from("trades")
      .select("copied")
      .eq("id", tradeId)
      .single();

    if (error || !data) {
      return false;
    }

    return data.copied || false;
  }

  /**
   * Mark a trade as copied
   */
  async markTradeAsCopied(tradeId: string, copiedTo: string[]): Promise<void> {
    if (!this.supabase) {
      throw new Error("Database not connected");
    }

    const { error } = await this.supabase
      .from("trades")
      .update({
        copied: true,
        copied_at: new Date().toISOString(),
        copied_to: copiedTo,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tradeId);

    if (error) {
      throw new Error(`Failed to mark trade as copied: ${error.message}`);
    }
  }

  /**
   * Get the latest trade for a user
   */
  async getLatestTrade(userAddress: string): Promise<StoredTrade | null> {
    if (!this.supabase) {
      return null;
    }

    const { data, error } = await this.supabase
      .from("trades")
      .select("*")
      .eq("user", userAddress.toLowerCase())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      user: data.user,
      market: data.market,
      asset_id: data.asset_id,
      side: data.side,
      size: data.size,
      price: data.price,
      timestamp: data.timestamp,
      copied: data.copied,
      copied_at: data.copied_at ? new Date(data.copied_at) : undefined,
      copied_to: data.copied_to,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
    };
  }

  /**
   * Add a copy trading subscriber
   * @param subscriberAddress - Address of user who wants to copy trades
   * @param traderAddress - Address of trader to copy FROM
   * @param percentage - Percentage of trade size to copy (1-100, default 100)
   */
  async addSubscriber(
    subscriberAddress: string,
    traderAddress: string,
    percentage: number = 100
  ): Promise<CopySubscriber> {
    if (!this.supabase) {
      throw new Error("Database not connected");
    }

    const now = new Date();
    
    // Ensure percentage is a number, not a string or boolean
    let percentageValue: number;
    if (typeof percentage === 'number') {
      percentageValue = percentage;
    } else if (typeof percentage === 'string') {
      percentageValue = parseFloat(percentage);
    } else if (typeof percentage === 'boolean') {
      // This shouldn't happen, but handle it gracefully
      console.error("[Database] Invalid percentage type (boolean):", percentage);
      percentageValue = 100; // Default to 100%
    } else {
      percentageValue = 100; // Default to 100%
    }
    
    // Validate percentage value
    if (isNaN(percentageValue) || percentageValue <= 0 || percentageValue > 100) {
      throw new Error(`Percentage must be a number between 1 and 100, got: ${percentage} (${typeof percentage})`);
    }

    // Check if subscriber already exists
    const { data: existing, error: findError } = await this.supabase
      .from("copy_subscribers")
      .select("*")
      .eq("address", subscriberAddress.toLowerCase())
      .eq("trader_address", traderAddress.toLowerCase())
      .maybeSingle();

    let data;
    let error;

    if (existing && !findError) {
      // Update existing subscriber
      const updateData: {
        percentage: number;
        active: boolean;
        updated_at: string;
      } = {
        percentage: Number(percentageValue), // Explicitly convert to Number
        active: true,
        updated_at: now.toISOString(),
      };
      
      console.log("[Database] Updating subscriber with data:", {
        ...updateData,
        percentageType: typeof updateData.percentage,
        percentageValue: updateData.percentage,
        percentageIsNumber: typeof updateData.percentage === 'number',
        activeType: typeof updateData.active,
      });
      
      const { data: updated, error: updateError } = await this.supabase
        .from("copy_subscribers")
        .update(updateData as any) // Type assertion to avoid TypeScript issues
        .eq("address", subscriberAddress.toLowerCase())
        .eq("trader_address", traderAddress.toLowerCase())
        .select()
        .single();

      data = updated;
      error = updateError;
      
      if (error) {
        console.error("[Database] Update error details:", {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          updateData,
        });
      }
    } else {
      // Insert new subscriber - explicitly set all fields to avoid type issues
      // Use object with explicit field order to avoid any serialization issues
      const insertData = {
      address: subscriberAddress.toLowerCase(),
      trader_address: traderAddress.toLowerCase(),
        percentage: percentageValue, // Already validated as number
      active: true,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
    };

      // Double-check types before sending
      if (typeof insertData.percentage !== 'number') {
        throw new Error(`Percentage must be a number, got ${typeof insertData.percentage}: ${insertData.percentage}`);
      }
      if (typeof insertData.active !== 'boolean') {
        throw new Error(`Active must be a boolean, got ${typeof insertData.active}: ${insertData.active}`);
      }
      
      console.log("[Database] Inserting subscriber with data:", JSON.stringify(insertData, null, 2));
      console.log("[Database] Types check:", {
        percentage: typeof insertData.percentage,
        percentageValue: insertData.percentage,
        active: typeof insertData.active,
        activeValue: insertData.active,
      });
      
      const { data: inserted, error: insertError } = await this.supabase
      .from("copy_subscribers")
        .insert(insertData)
      .select()
      .single();

      data = inserted;
      error = insertError;
      
      if (error) {
        console.error("[Database] Insert error details:", {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          insertData,
        });
      }
    }

    if (error) {
      throw new Error(`Failed to add subscriber: ${error.message}`);
    }

    // Ensure trader is being monitored
    await this.addMonitoredTrader(traderAddress);

    return {
      id: data.id,
      address: data.address,
      trader_address: data.trader_address,
      percentage: data.percentage ? parseFloat(data.percentage) : 100,
      active: data.active,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
    };
  }

  /**
   * Remove a copy trading subscriber
   * @param subscriberAddress - Address of subscriber
   * @param traderAddress - Address of trader (optional, removes all if not specified)
   */
  async removeSubscriber(subscriberAddress: string, traderAddress?: string): Promise<void> {
    if (!this.supabase) {
      throw new Error("Database not connected");
    }

    const query = this.supabase
      .from("copy_subscribers")
      .update({
        active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("address", subscriberAddress.toLowerCase());

    if (traderAddress) {
      query.eq("trader_address", traderAddress.toLowerCase());
    }

    const { error } = await query;

    if (error) {
      throw new Error(`Failed to remove subscriber: ${error.message}`);
    }

    // Check if trader still has active subscribers
    if (traderAddress) {
      const activeSubscribers = await this.getSubscriberCount(traderAddress);

      // If no active subscribers, stop monitoring trader
      if (activeSubscribers === 0) {
        await this.removeMonitoredTrader(traderAddress);
      }
    }
  }

  /**
   * Get all active copy trading subscribers for a specific trader
   */
  async getActiveSubscribers(traderAddress?: string): Promise<CopySubscriber[]> {
    if (!this.supabase) {
      return [];
    }

    let query = this.supabase
      .from("copy_subscribers")
      .select("*")
      .eq("active", true);

    if (traderAddress) {
      query = query.eq("trader_address", traderAddress.toLowerCase());
    }

    const { data, error } = await query;

    if (error || !data) {
      return [];
    }

    return data.map((sub: any) => ({
      id: sub.id,
      address: sub.address,
      trader_address: sub.trader_address,
      percentage: sub.percentage ? parseFloat(sub.percentage) : 100,
      active: sub.active,
      created_at: new Date(sub.created_at),
      updated_at: new Date(sub.updated_at),
    }));
  }

  /**
   * Get subscribers for a specific user (who they're copying)
   */
  async getSubscriptionsForUser(userAddress: string): Promise<CopySubscriber[]> {
    if (!this.supabase) {
      return [];
    }

    const { data, error } = await this.supabase
      .from("copy_subscribers")
      .select("*")
      .eq("address", userAddress.toLowerCase())
      .eq("active", true);

    if (error || !data) {
      return [];
    }

    return data.map((sub: any) => ({
      id: sub.id,
      address: sub.address,
      trader_address: sub.trader_address,
      percentage: sub.percentage ? parseFloat(sub.percentage) : 100,
      active: sub.active,
      created_at: new Date(sub.created_at),
      updated_at: new Date(sub.updated_at),
    }));
  }

  /**
   * Get subscriber count for a trader
   */
  async getSubscriberCount(traderAddress?: string): Promise<number> {
    if (!this.supabase) {
      return 0;
    }

    let query = this.supabase
      .from("copy_subscribers")
      .select("id", { count: "exact", head: true })
      .eq("active", true);

    if (traderAddress) {
      query = query.eq("trader_address", traderAddress.toLowerCase());
    }

    const { count, error } = await query;

    if (error) {
      return 0;
    }

    return count || 0;
  }

  /**
   * Add a trader to monitor list
   */
  async addMonitoredTrader(address: string): Promise<MonitoredTrader> {
    if (!this.supabase) {
      throw new Error("Database not connected");
    }

    const now = new Date();
    const traderAddress = address.toLowerCase();

    // Check if trader already exists
    const { data: existing, error: findError } = await this.supabase
      .from("monitored_traders")
      .select("*")
      .eq("address", traderAddress)
      .maybeSingle();

    let data;
    let error;

    if (existing && !findError) {
      // Update existing trader
      const { data: updated, error: updateError } = await this.supabase
        .from("monitored_traders")
        .update({
          active: true,
          updated_at: now.toISOString(),
        })
        .eq("address", traderAddress)
        .select()
        .single();

      data = updated;
      error = updateError;
    } else {
      // Insert new trader
      const { data: inserted, error: insertError } = await this.supabase
        .from("monitored_traders")
        .insert({
          address: traderAddress,
          active: true,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
      .select()
      .single();

      data = inserted;
      error = insertError;
    }

    if (error) {
      console.error("[Database] Failed to add monitored trader:", {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        address: traderAddress,
      });
      throw new Error(`Failed to add monitored trader: ${error.message}`);
    }

    return {
      id: data.id,
      address: data.address,
      active: data.active,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
    };
  }

  /**
   * Remove a trader from monitor list
   */
  async removeMonitoredTrader(address: string): Promise<void> {
    if (!this.supabase) {
      throw new Error("Database not connected");
    }

    const { error } = await this.supabase
      .from("monitored_traders")
      .update({
        active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("address", address.toLowerCase());

    if (error) {
      throw new Error(`Failed to remove monitored trader: ${error.message}`);
    }
  }

  /**
   * Get all active monitored traders
   */
  async getActiveMonitoredTraders(): Promise<MonitoredTrader[]> {
    if (!this.supabase) {
      return [];
    }

    const { data, error } = await this.supabase
      .from("monitored_traders")
      .select("*")
      .eq("active", true);

    if (error || !data) {
      return [];
    }

    return data.map((trader: any) => ({
      id: trader.id,
      address: trader.address,
      active: trader.active,
      created_at: new Date(trader.created_at),
      updated_at: new Date(trader.updated_at),
    }));
  }
}

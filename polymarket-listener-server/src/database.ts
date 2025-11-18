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
    const storedTrade: Omit<StoredTrade, "id"> = {
      ...tradeData,
      copied: false,
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await this.supabase
      .from("trades")
      .upsert(
        {
          id: tradeData.id,
          ...storedTrade,
        },
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
   */
  async addSubscriber(subscriberAddress: string, traderAddress: string): Promise<CopySubscriber> {
    if (!this.supabase) {
      throw new Error("Database not connected");
    }

    const now = new Date();
    const subscriber: Omit<CopySubscriber, "id"> = {
      address: subscriberAddress.toLowerCase(),
      trader_address: traderAddress.toLowerCase(),
      active: true,
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await this.supabase
      .from("copy_subscribers")
      .upsert(
        {
          ...subscriber,
        },
        {
          onConflict: "address,trader_address",
        }
      )
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add subscriber: ${error.message}`);
    }

    // Ensure trader is being monitored
    await this.addMonitoredTrader(traderAddress);

    return {
      id: data.id,
      address: data.address,
      trader_address: data.trader_address,
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
    const trader: Omit<MonitoredTrader, "id"> = {
      address: address.toLowerCase(),
      active: true,
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await this.supabase
      .from("monitored_traders")
      .upsert(
        {
          ...trader,
        },
        {
          onConflict: "address",
        }
      )
      .select()
      .single();

    if (error) {
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

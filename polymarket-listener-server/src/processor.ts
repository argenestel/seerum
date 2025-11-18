import axios from "axios";
import { EventEmitter } from "events";
import { TradeData, PositionData } from "./listener";
import { Database, CopySubscriber } from "./database";

export interface ProcessorConfig {
  builderSigningServerUrl: string;
  database: Database;
}

/**
 * Processes Polymarket events and can trigger actions
 * (e.g., copy trading, notifications, etc.)
 */
export class EventProcessor extends EventEmitter {
  private config: ProcessorConfig;

  constructor(config: ProcessorConfig) {
    super();
    this.config = config;
  }

  /**
   * Handle a new trade event
   * Validates trade, stores in DB, and fires copy trading event
   */
  async handleTrade(tradeData: TradeData): Promise<void> {
    // Validate required fields
    if (!tradeData.side || !tradeData.asset_id) {
      console.log(`⚠️  Trade ${tradeData.id} missing required fields (side or asset_id), skipping`);
      return;
    }

    // Check if trade already copied (from database)
    const isCopied = await this.config.database.isTradeCopied(tradeData.id);
    if (isCopied) {
      console.log(`⏭️  Trade ${tradeData.id} already copied, skipping`);
      return;
    }

    // Store trade in MongoDB
    try {
      await this.config.database.storeTrade(tradeData);
      console.log(`💾 Stored trade ${tradeData.id} in database`);
    } catch (error) {
      console.error(`❌ Failed to store trade ${tradeData.id}:`, error);
      // Continue processing even if storage fails
    }

    console.log(`\n📊 Processing NEW trade:`);
    console.log(`   Trade ID: ${tradeData.id}`);
    console.log(`   User: ${tradeData.user}`);
    console.log(`   Market: ${tradeData.market}`);
    console.log(`   Side: ${tradeData.side}`);
    console.log(`   Size: ${tradeData.size}`);
    console.log(`   Price: ${tradeData.price}`);
    console.log(`   Token ID: ${tradeData.asset_id}`);

    // Fire event for copy trading subscribers
    this.emit("copyTrade", tradeData);
  }

  /**
   * Handle a position update
   */
  async handlePosition(positionData: PositionData): Promise<void> {
    console.log(`\n💼 Processing position update:`);
    console.log(`   User: ${positionData.user}`);
    console.log(`   Market: ${positionData.market}`);
    console.log(`   Outcome: ${positionData.outcome}`);
    console.log(`   Size: ${positionData.size}`);
    console.log(`   Current Price: ${positionData.currentPrice || "N/A"}`);
    console.log(`   Unrealized P&L: ${positionData.unrealizedPnl || "N/A"}`);

    // Here you can add logic to:
    // 1. Track position changes
    // 2. Calculate P&L
    // 3. Send alerts
    // etc.
  }

  /**
   * Log trade for potential copy trading
   */
  private async logTradeForCopyTrading(tradeData: TradeData): Promise<void> {
    // This is where you'd implement copy trading logic
    // For now, just log it
    
    const tradeInfo = {
      tradeId: tradeData.id,
      user: tradeData.user,
      market: tradeData.market,
      tokenId: tradeData.asset_id,
      side: tradeData.side,
      size: tradeData.size,
      price: tradeData.price,
      timestamp: tradeData.timestamp,
    };

    // You could:
    // 1. Store in database
    // 2. Send to copy trading queue
    // 3. Call builder signing server to execute copy trade
    // 4. Send webhook notification
    
    console.log("📝 Trade logged for copy trading:", JSON.stringify(tradeInfo, null, 2));
  }

  /**
   * Execute copy trade for a subscriber using their vault wallet
   */
  async executeCopyTrade(
    targetUser: string,
    tradeData: TradeData,
    copyAmount?: string
  ): Promise<boolean> {
    console.log(`\n🔄 Executing copy trade for user ${targetUser}:`);
    console.log(`   Copying trade: ${tradeData.id}`);
    console.log(`   Original size: ${tradeData.size}`);
    console.log(`   Copy size: ${copyAmount || tradeData.size}`);

    try {
      // Get subscriber's vault wallet from database
      const vault = await this.getVaultForUser(targetUser);
      if (!vault) {
        console.error(`❌ No vault found for subscriber ${targetUser}`);
        return false;
      }

      // Import CLOB client utilities
      const { ClobClient, Side, OrderType } = await import("@polymarket/clob-client");
      const { SignatureType } = await import("@polymarket/order-utils");
      const { ethers } = await import("ethers");
      const { Wallet } = await import("@ethersproject/wallet");

      // Create wallet from vault private key
      const wallet = new Wallet(vault.private_key);
      const provider = new ethers.providers.JsonRpcProvider(
        process.env.POLYGON_RPC_URL || "https://polygon-rpc.com"
      );
      const connectedWallet = wallet.connect(provider);

      // Create CLOB client
      // Note: Using minimal constructor - adjust based on your ClobClient version
      const client = new ClobClient(
        "https://clob.polymarket.com",
        137, // Polygon
        connectedWallet
      );

      // Try to set up API credentials if methods exist
      try {
        if (typeof (client as any).create_or_derive_api_creds === "function") {
          const apiCreds = await (client as any).create_or_derive_api_creds();
          if (typeof (client as any).set_api_creds === "function") {
            (client as any).set_api_creds(apiCreds);
          }
        }
      } catch (e) {
        console.log("⚠️  API credentials setup skipped");
      }

      // Parse trade parameters
      const side = tradeData.side === "BUY" ? Side.BUY : Side.SELL;
      const size = parseFloat(copyAmount || tradeData.size);
      const price = parseFloat(tradeData.price);
      const tokenId = tradeData.asset_id;

      if (!tokenId || !side || isNaN(size) || isNaN(price)) {
        console.error(`❌ Invalid trade parameters`);
        return false;
      }

      // Create and post order
      const order = await client.createOrder({
        tokenID: tokenId,
        side,
        size,
        price,
      });

      const response = await client.postOrder(order, OrderType.GTC);

      console.log(`✅ Copy trade executed for ${targetUser}:`);
      console.log(`   Order ID: ${response.order_id || response.id || "N/A"}`);
      return true;
    } catch (error: any) {
      console.error(`❌ Failed to execute copy trade for ${targetUser}: ${error.message}`);
      console.error("   Full error:", error);
      return false;
    }
  }

  /**
   * Get vault wallet for a user from Supabase
   */
  private async getVaultForUser(userAddress: string): Promise<{ private_key: string } | null> {
    try {
      // Access Supabase from database instance
      const supabase = (this.config.database as any).supabase;
      if (!supabase) {
        console.error("❌ Supabase client not available");
        return null;
      }

      const { data, error } = await supabase
        .from("vaults")
        .select("private_key")
        .eq("user_address", userAddress.toLowerCase())
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          console.log(`⚠️  No vault found for user ${userAddress}`);
        } else {
          console.error(`❌ Error fetching vault: ${error.message}`);
        }
        return null;
      }

      if (!data || !data.private_key) {
        return null;
      }

      return { private_key: data.private_key };
    } catch (error: any) {
      console.error(`❌ Exception fetching vault: ${error.message}`);
      return null;
    }
  }

  /**
   * Process copy trade event for all subscribers of the trader
   */
  async processCopyTradeEvent(tradeData: TradeData): Promise<void> {
    // Get all active subscribers for this specific trader
    const subscribers = await this.config.database.getActiveSubscribers(tradeData.user);
    
    if (subscribers.length === 0) {
      console.log(`ℹ️  No active copy trading subscribers for trader ${tradeData.user}`);
      return;
    }

    console.log(`\n📢 Firing copy trade event to ${subscribers.length} subscriber(s) for trader ${tradeData.user}`);

    const copiedTo: string[] = [];
    const failed: string[] = [];

    // Execute copy trade for each subscriber
    for (const subscriber of subscribers) {
      try {
        const success = await this.executeCopyTrade(subscriber.address, tradeData);
        if (success) {
          copiedTo.push(subscriber.address);
        } else {
          failed.push(subscriber.address);
        }
      } catch (error) {
        console.error(`❌ Error copying to ${subscriber.address}:`, error);
        failed.push(subscriber.address);
      }
    }

    // Mark trade as copied in database
    if (copiedTo.length > 0) {
      await this.config.database.markTradeAsCopied(tradeData.id, copiedTo);
      console.log(`✅ Trade ${tradeData.id} marked as copied to ${copiedTo.length} user(s)`);
    }

    if (failed.length > 0) {
      console.log(`⚠️  Failed to copy to ${failed.length} user(s):`, failed);
    }
  }
}


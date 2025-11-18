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
   * Uses createMarketOrder with Safe address (like test-vault-trading.ts)
   */
  async executeCopyTrade(
    targetUser: string,
    tradeData: TradeData,
    percentage: number = 100
  ): Promise<boolean> {
    console.log(`\n🔄 Executing copy trade for user ${targetUser}:`);
    console.log(`   Copying trade: ${tradeData.id}`);
    console.log(`   Original size: ${tradeData.size}`);
    console.log(`   Percentage: ${percentage}%`);

    try {
      // Get subscriber's vault wallet from database
      const vault = await this.getVaultForUser(targetUser);
      if (!vault) {
        console.error(`❌ No vault found for subscriber ${targetUser}`);
        return false;
      }

      // Get Safe address for the vault
      const safeAddress = await this.getSafeAddressForVault(vault.vault_address);
      if (!safeAddress) {
        console.error(`❌ Could not determine Safe address for vault ${vault.vault_address}`);
        return false;
      }

      // Import CLOB client utilities
      const { ClobClient, Side, OrderType } = await import("@polymarket/clob-client");
      const { SignatureType } = await import("@polymarket/order-utils");
      const { ethers } = await import("ethers");
      const { Wallet } = await import("@ethersproject/wallet");

      const CLOB_HOST = "https://clob.polymarket.com";
      const CHAIN_ID = 137; // Polygon mainnet
      const RPC_URL = process.env.POLYGON_RPC_URL || process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon-rpc.com";

      // Create wallet from vault private key
      const wallet = new Wallet(vault.private_key);
      const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
      const connectedWallet = wallet.connect(provider);

      // Create initial CLOB client to get API credentials
      const tempClient = new ClobClient(CLOB_HOST, CHAIN_ID, connectedWallet);
      const apiCreds = await (tempClient as any).createOrDeriveApiKey();

      // Create CLOB client with Safe address (signature type 2 = POLY_PROXY)
      const client = new ClobClient(
        CLOB_HOST,
        CHAIN_ID,
        connectedWallet,
        apiCreds,
        2, // SignatureType.POLY_PROXY
        safeAddress
      );

      // Parse trade parameters
      const side = tradeData.side === "BUY" ? Side.BUY : Side.SELL;
      const originalSize = parseFloat(tradeData.size);
      const originalPrice = parseFloat(tradeData.price);
      const tokenId = tradeData.asset_id;

      if (!tokenId || !side || isNaN(originalSize) || isNaN(originalPrice)) {
        console.error(`❌ Invalid trade parameters`);
        return false;
      }

      // Calculate order value (price * size)
      const originalOrderValue = originalPrice * originalSize;
      
      // Scale by percentage
      const scaledOrderValue = (originalOrderValue * percentage) / 100;
      
      // Minimum order value is $1
      const MIN_ORDER_VALUE = 1.0;
      const finalOrderValue = Math.max(scaledOrderValue, MIN_ORDER_VALUE);
      
      console.log(`   Original order value: $${originalOrderValue.toFixed(2)}`);
      console.log(`   Scaled order value (${percentage}%): $${scaledOrderValue.toFixed(2)}`);
      console.log(`   Final order value (min $${MIN_ORDER_VALUE}): $${finalOrderValue.toFixed(2)}`);

      // Create market order (amount is in USD, not size)
      // Using type assertion as createMarketOrder may not be in types yet
      const order = await (client as any).createMarketOrder({
        tokenID: tokenId,
        amount: finalOrderValue, // Amount in USD
        side: side,
      });

      // Post order with FAK (Fill or Kill) type
      // OrderType.FAK should exist, but using type assertion for safety
      const orderType = (OrderType as any).FAK ?? OrderType.GTC; // Fallback to GTC if FAK doesn't exist
      const response = await client.postOrder(order, orderType);

      console.log(`✅ Copy trade executed for ${targetUser}:`);
      console.log(`   Order ID: ${response.order_id || response.id || "N/A"}`);
      console.log(`   Safe Address: ${safeAddress}`);
      return true;
    } catch (error: any) {
      console.error(`❌ Failed to execute copy trade for ${targetUser}: ${error.message}`);
      console.error("   Full error:", error);
      if (error?.response?.data) {
        console.error("   Error details:", JSON.stringify(error.response.data, null, 2));
      }
      return false;
    }
  }

  /**
   * Get vault wallet for a user from Supabase
   */
  private async getVaultForUser(userAddress: string): Promise<{ private_key: string; vault_address: string } | null> {
    try {
      // Access Supabase from database instance
      const supabase = (this.config.database as any).supabase;
      if (!supabase) {
        console.error("❌ Supabase client not available");
        return null;
      }

      const { data, error } = await supabase
        .from("vaults")
        .select("private_key, vault_address")
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

      if (!data || !data.private_key || !data.vault_address) {
        return null;
      }

      return { 
        private_key: data.private_key,
        vault_address: data.vault_address
      };
    } catch (error: any) {
      console.error(`❌ Exception fetching vault: ${error.message}`);
      return null;
    }
  }

  /**
   * Get Safe address for a vault address
   * Computes the Safe address using the factory contract
   */
  private async getSafeAddressForVault(vaultAddress: string): Promise<string | null> {
    try {
      const { ethers } = await import("ethers");
      const SAFE_FACTORY_ADDRESS = "0xaacFeEa03eb1561C4e67d661e40682Bd20E3541b";
      const SAFE_FACTORY_ABI = [
        {
          inputs: [{ internalType: "address", name: "user", type: "address" }],
          name: "computeProxyAddress",
          outputs: [{ internalType: "address", name: "", type: "address" }],
          stateMutability: "view",
          type: "function",
        },
      ];

      const RPC_URL = process.env.POLYGON_RPC_URL || process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon-rpc.com";
      const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

      // Get Safe factory contract
      const factory = new ethers.Contract(
        SAFE_FACTORY_ADDRESS,
        SAFE_FACTORY_ABI,
        provider
      );

      // Compute Safe address
      const safeAddress = await factory.computeProxyAddress(vaultAddress);

      // Check if Safe is deployed by checking bytecode
      const code = await provider.getCode(safeAddress);
      const deployed = !!(code && code !== "0x");

      if (!deployed) {
        console.log(`⚠️  Safe wallet not deployed yet for vault ${vaultAddress}`);
        console.log(`   Computed Safe address: ${safeAddress}`);
        console.log(`   💡 Safe will be deployed automatically on first use`);
      }

      return safeAddress;
    } catch (error: any) {
      console.error(`❌ Error computing Safe address: ${error.message}`);
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
        const percentage = subscriber.percentage || 100;
        const success = await this.executeCopyTrade(subscriber.address, tradeData, percentage);
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


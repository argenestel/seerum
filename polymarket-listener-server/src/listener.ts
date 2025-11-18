import axios from "axios";
import { EventEmitter } from "events";

export interface TradeData {
  id: string;
  user: string;
  market: string;
  asset_id: string;
  side: "BUY" | "SELL";
  size: string;
  price: string;
  timestamp: string;
  outcome?: string;
  [key: string]: any;
}

export interface PositionData {
  user: string;
  market: string;
  outcome: string;
  size: string;
  currentPrice?: string;
  realizedPnl?: string;
  unrealizedPnl?: string;
  [key: string]: any;
}

export interface ListenerConfig {
  dataApiBase: string;
  gammaApiBase: string;
}

/**
 * Listens for Polymarket user events
 */
export class PolymarketEventListener extends EventEmitter {
  private config: ListenerConfig;
  private monitoredUsers: Set<string> = new Set();
  private lastTradeTimestamps: Map<string, number> = new Map();
  private isRunning = false;

  constructor(config: ListenerConfig) {
    super();
    this.config = config;
  }

  /**
   * Start monitoring a specific user
   */
  async startMonitoringUser(userAddress: string): Promise<void> {
    if (this.monitoredUsers.has(userAddress)) {
      console.log(`User ${userAddress} is already being monitored`);
      return;
    }

    this.monitoredUsers.add(userAddress);
    console.log(`✅ Started monitoring user: ${userAddress}`);

    // Initial poll
    await this.pollUserActivity(userAddress);
  }

  /**
   * Stop monitoring a user
   */
  stopMonitoringUser(userAddress: string): void {
    this.monitoredUsers.delete(userAddress);
    this.lastTradeTimestamps.delete(userAddress);
    console.log(`⏹️  Stopped monitoring user: ${userAddress}`);
  }

  /**
   * Poll user activity for new trades
   * Returns only the latest trade if it's new
   */
  async pollUserActivity(userAddress: string): Promise<TradeData | null> {
    try {
      // Fetch only the latest trade (limit=1)
      const trades = await this.fetchUserTrades(userAddress, 1);
      
      if (trades.length === 0) {
        return null;
      }

      // Get the latest trade (first one, as API returns most recent first)
      const latestTrade = trades[0];
      
      // Map API field names to our expected format
      // API returns "asset" but we need "asset_id"
      const assetId = latestTrade.asset_id || latestTrade.asset || latestTrade.token_id;
      const side = latestTrade.side;
      
      // Validate required fields: side and asset_id are mandatory for copy trading
      // Note: Some activities from the API might be position updates, redemptions, etc.
      // We only process actual trades that have side (BUY/SELL) and asset_id (token ID)
      if (!side || !assetId) {
        const tradeId = latestTrade.id || latestTrade.trade_id || latestTrade.transactionHash || 'unknown';
        const activityType = latestTrade.type || latestTrade.activity_type || 'unknown';
        console.log(`⚠️  Activity ${tradeId} (type: ${activityType}) missing required fields for copy trading:`);
        console.log(`   - side: ${side || 'MISSING'}`);
        console.log(`   - asset_id: ${assetId || 'MISSING'}`);
        console.log(`   Available fields: asset=${latestTrade.asset}, asset_id=${latestTrade.asset_id}, token_id=${latestTrade.token_id}`);
        console.log(`   This might be a ${activityType} event, not a trade. Skipping copy trade.`);
        return null;
      }

      const tradeTimestamp = new Date(latestTrade.match_time || latestTrade.timestamp).getTime();
      const lastTimestamp = this.lastTradeTimestamps.get(userAddress) || 0;
      
      // Only return if this is a new trade (newer than last seen)
      if (tradeTimestamp > lastTimestamp) {
        // Map API fields to our TradeData format
        const tradeData: TradeData = {
          id: latestTrade.transactionHash || latestTrade.id || `trade-${tradeTimestamp}`, // Use transactionHash as ID
          user: userAddress,
          market: latestTrade.title || latestTrade.slug || latestTrade.eventSlug || latestTrade.market || "unknown", // Map market field
          asset_id: assetId, // Ensure asset_id is set (map from "asset" if needed)
          side: side as "BUY" | "SELL",
          size: String(latestTrade.size || latestTrade.usdcSize || "0"),
          price: String(latestTrade.price || "0"),
          timestamp: latestTrade.match_time || latestTrade.timestamp || new Date(tradeTimestamp).toISOString(),
        };

        // Update last timestamp BEFORE emitting (to prevent duplicate processing)
        this.lastTradeTimestamps.set(userAddress, tradeTimestamp);
        
        this.emit("trade", tradeData);
        return tradeData;
      }

      return null;
    } catch (error) {
      this.emit("error", error);
      throw error;
    }
  }

  /**
   * Fetch user trades from Polymarket API
   */
  private async fetchUserTrades(userAddress: string, limit = 25): Promise<any[]> {
    try {
      const response = await axios.get(`${this.config.dataApiBase}/activity`, {
        params: {
          user: userAddress,
          limit,
          offset: 0,
        },
        headers: {
          "Accept": "application/json",
        },
      });

      const trades = response.data.trades || response.data || [];
      
      // Log what we're getting for debugging
      if (trades.length > 0) {
        console.log(`📥 Fetched ${trades.length} activity items for ${userAddress}`);
        // Log first trade structure to understand the format
        if (trades[0]) {
          console.log(`   Sample activity item keys:`, Object.keys(trades[0]));
          console.log(`   Sample activity item:`, JSON.stringify(trades[0], null, 2).substring(0, 500));
        }
      }
      
      return trades;
    } catch (error) {
      console.error(`Error fetching trades for ${userAddress}:`, error);
      return [];
    }
  }

  /**
   * Fetch user positions from Polymarket API
   */
  private async fetchUserPositions(userAddress: string, limit = 50): Promise<any[]> {
    try {
      const response = await axios.get(`${this.config.dataApiBase}/positions`, {
        params: {
          user: userAddress,
          limit,
          offset: 0,
          sortBy: "CURRENT",
          sortDirection: "DESC",
          sizeThreshold: 0.1,
        },
        headers: {
          "Accept": "application/json",
        },
      });

      return response.data.positions || response.data || [];
    } catch (error) {
      console.error(`Error fetching positions for ${userAddress}:`, error);
      return [];
    }
  }

  /**
   * Stop all monitoring
   */
  stop(): void {
    this.isRunning = false;
    this.monitoredUsers.clear();
    this.lastTradeTimestamps.clear();
    console.log("🛑 Stopped all monitoring");
  }

  /**
   * Get list of monitored users
   */
  getMonitoredUsers(): string[] {
    return Array.from(this.monitoredUsers);
  }

  /**
   * Check if a user is being monitored
   */
  isMonitoringUser(address: string): boolean {
    return this.monitoredUsers.has(address);
  }
}


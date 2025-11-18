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
      
      // Validate required fields: side and asset_id are mandatory
      if (!latestTrade.side || !latestTrade.asset_id) {
        console.log(`⚠️  Trade ${latestTrade.id} missing required fields (side or asset_id), skipping`);
        return null;
      }

      const tradeTimestamp = new Date(latestTrade.match_time || latestTrade.timestamp).getTime();
      const lastTimestamp = this.lastTradeTimestamps.get(userAddress) || 0;
      
      // Only return if this is a new trade (newer than last seen)
      if (tradeTimestamp > lastTimestamp) {
        const tradeData: TradeData = {
          ...latestTrade,
          user: userAddress,
          timestamp: latestTrade.match_time || latestTrade.timestamp,
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

      return response.data.trades || response.data || [];
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


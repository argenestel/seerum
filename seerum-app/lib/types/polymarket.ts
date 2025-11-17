// Polymarket API Types

export interface LeaderboardEntry {
  rank: string | number;
  proxyWallet: string;
  userName: string;
  xUsername?: string;
  verifiedBadge: boolean;
  vol: number;
  pnl: number;
  profileImage?: string;
  // Calculated fields (not from API)
  roi?: number;
  winRate?: number;
  trades?: number;
  // Legacy field for compatibility
  user?: string;
}

export interface LeaderboardResponse {
  data: LeaderboardEntry[];
  total?: number;
}

export interface Trade {
  id: string;
  taker_order_id: string;
  market: string;
  asset_id: string;
  side: "BUY" | "SELL";
  size: string;
  price: string;
  fee_rate_bps: string;
  status: string;
  match_time: string;
  last_update: string;
  outcome: string;
  maker_address: string;
  owner: string;
  transaction_hash: string;
  bucket_index: number;
  maker_orders: MakerOrder[];
  type: "TAKER" | "MAKER";
}

export interface MakerOrder {
  order_id: string;
  maker_address: string;
  owner: string;
  matched_amount: string;
  fee_rate_bps: string;
  price: string;
  asset_id: string;
  outcome: string;
  side: "BUY" | "SELL";
}

export interface TraderActivity {
  trades: Trade[];
  total: number;
}

export interface TraderInfo {
  address: string;
  vol: string;
  pnl: string;
  roi: string;
  winRate: string;
  trades: string;
  rank: number;
}

export interface PnLDataPoint {
  t: number; // timestamp
  p: number; // P&L value
}

export interface Position {
  market: string;
  outcome: string;
  size: string;
  currentPrice?: string;
  realizedPnl?: string;
  unrealizedPnl?: string;
  [key: string]: any;
}

export interface UserProfile {
  profile: LeaderboardEntry | null;
  activity: Trade[];
  closedPositions: Position[];
  positions: Position[];
  pnlData: PnLDataPoint[];
}


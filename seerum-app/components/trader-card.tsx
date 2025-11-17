"use client";

import { TrendingUp, TrendingDown, Copy, ExternalLink } from "lucide-react";
import { LeaderboardEntry } from "@/lib/types/polymarket";
import Link from "next/link";

interface TraderCardProps {
  trader: LeaderboardEntry;
  rank: number;
  onCopyTrade?: (address: string) => void;
}

export function TraderCard({ trader, rank, onCopyTrade }: TraderCardProps) {
  
  const formatAddress = (address: string) => {
    if (!address) return "Unknown";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };
  
  // Handle both number and string types
  const pnl = typeof trader.pnl === 'number' ? trader.pnl : parseFloat(trader.pnl?.toString() || "0");
  const vol = typeof trader.vol === 'number' ? trader.vol : parseFloat(trader.vol?.toString() || "0");
  
  // Calculate ROI if not provided: ROI = (PNL / Volume) * 100
  const roi = trader.roi !== undefined 
    ? (typeof trader.roi === 'number' ? trader.roi : parseFloat(trader.roi?.toString() || "0"))
    : vol > 0 
      ? (pnl / vol) * 100 
      : 0;
  
  const winRate = trader.winRate !== undefined 
    ? (typeof trader.winRate === 'number' ? trader.winRate : parseFloat(trader.winRate?.toString() || "0"))
    : 0;

  // Get the address (proxyWallet or user)
  const address = trader.proxyWallet || trader.user || "";
  const displayName = trader.userName || formatAddress(address);

  const formatCurrency = (value: number | string) => {
    const num = typeof value === 'number' ? value : parseFloat(value?.toString() || "0");
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(2)}M`;
    }
    if (num >= 1000) {
      return `$${(num / 1000).toFixed(2)}K`;
    }
    return `$${num.toFixed(2)}`;
  };

  return (
    <>
      <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-border rounded-2xl p-6 hover:bg-white/15 dark:hover:bg-black/15 transition-all">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              {trader.profileImage ? (
                <img
                  src={trader.profileImage}
                  alt={displayName}
                  className="w-10 h-10 rounded-full border border-border object-cover"
                  onError={(e) => {
                    // Fallback to rank badge if image fails to load
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted backdrop-blur-md border border-border font-semibold">
                  #{rank}
                </div>
              )}
              {trader.profileImage && (
                <div className="absolute -bottom-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-muted backdrop-blur-md border border-border text-xs font-semibold">
                  #{rank}
                </div>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-lg">
                {displayName}
              </h3>
              <a
                href={`https://polymarket.com/profile/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
              >
                View Profile
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
          {pnl >= 0 ? (
            <TrendingUp className="h-5 w-5 text-green-500" />
          ) : (
            <TrendingDown className="h-5 w-5 text-red-500" />
          )}
        </div>

        <div className="space-y-3 mb-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="backdrop-blur-md bg-white/5 dark:bg-black/5 rounded-lg p-3 border border-border">
              <div className="text-xs text-muted-foreground mb-1">Volume</div>
              <div className="font-semibold">{formatCurrency(vol)}</div>
            </div>
            <div className="backdrop-blur-md bg-white/5 dark:bg-black/5 rounded-lg p-3 border border-border">
              <div className="text-xs text-muted-foreground mb-1">P&L</div>
              <div
                className={`font-semibold ${
                  pnl >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {pnl >= 0 ? "+" : ""}
                {formatCurrency(pnl)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="backdrop-blur-md bg-white/5 dark:bg-black/5 rounded-lg p-3 border border-border">
              <div className="text-xs text-muted-foreground mb-1">ROI</div>
              <div
                className={`font-semibold ${
                  roi >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {roi >= 0 ? "+" : ""}
                {roi.toFixed(2)}%
              </div>
            </div>
            {winRate > 0 && (
              <div className="backdrop-blur-md bg-white/5 dark:bg-black/5 rounded-lg p-3 border border-border">
                <div className="text-xs text-muted-foreground mb-1">Win Rate</div>
                <div className="font-semibold">{winRate.toFixed(1)}%</div>
              </div>
            )}
            {trader.trades !== undefined && trader.trades !== null && (
              <div className="backdrop-blur-md bg-white/5 dark:bg-black/5 rounded-lg p-3 border border-border">
                <div className="text-xs text-muted-foreground mb-1">Total Trades</div>
                <div className="font-semibold">{trader.trades}</div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/trader/${address}`}
            className="flex-1 rounded-lg bg-muted text-foreground px-4 py-2.5 text-sm font-medium hover:bg-muted/80 transition-all text-center"
          >
            View Details
          </Link>
          <button
            onClick={() => onCopyTrade?.(address)}
            className="flex-1 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
          >
            <Copy className="h-4 w-4" />
            Copy Trade
          </button>
        </div>
      </div>
    </>
  );
}


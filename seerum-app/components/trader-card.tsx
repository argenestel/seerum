"use client";

import { Copy, CheckCircle2, Loader2 } from "lucide-react";
import { LeaderboardEntry } from "@/lib/types/polymarket";
import Link from "next/link";
import { useIsSubscribedToTrader, useSubscribeToTrader, useUnsubscribeFromTrader } from "@/lib/hooks/useCopyTrade";
import { Address } from "viem";

interface TraderCardProps {
  trader: LeaderboardEntry;
  rank: number;
  onCopyTrade?: (address: string) => void;
}

export function TraderCard({ trader, rank, onCopyTrade }: TraderCardProps) {
  // Get the address (proxyWallet or user)
  const address = trader.proxyWallet || trader.user || "";
  const traderAddress = address as Address;
  
  const isSubscribed = useIsSubscribedToTrader(traderAddress);
  const subscribe = useSubscribeToTrader();
  const unsubscribe = useUnsubscribeFromTrader();
  
  const formatAddress = (address: string) => {
    if (!address) return "Unknown";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };
  
  const handleSubscribe = async () => {
    if (!traderAddress) return;
    try {
      await subscribe.mutateAsync(traderAddress);
    } catch (error) {
      console.error("Subscribe error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to subscribe";
      alert(`Failed to subscribe: ${errorMessage}\n\nPlease ensure:\n1. The listener server is running on port 3002\n2. NEXT_PUBLIC_LISTENER_SERVER_URL is set in .env.local`);
    }
  };
  
  const handleUnsubscribe = async () => {
    if (!traderAddress) return;
    try {
      await unsubscribe.mutateAsync(traderAddress);
    } catch (error) {
      console.error("Unsubscribe error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to unsubscribe";
      alert(`Failed to unsubscribe: ${errorMessage}`);
    }
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

  const seerScore = trader.seerscore !== undefined 
    ? (typeof trader.seerscore === 'number' ? trader.seerscore : parseFloat(trader.seerscore?.toString() || "0"))
    : 0;

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

  const getSeerScoreColor = (score: number) => {
    if (score >= 10) return "text-yellow-600 dark:text-yellow-400";
    if (score >= 9) return "text-purple-600 dark:text-purple-400";
    if (score >= 8) return "text-blue-600 dark:text-blue-400";
    if (score >= 7) return "text-green-600 dark:text-green-400";
    return "text-foreground";
  };

  return (
    <>
      <div className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground">#{rank}</div>
            <div>
              <h3 className="font-medium text-sm">
                {displayName}
              </h3>
            </div>
          </div>
          {seerScore > 0 && (
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Seer</div>
              <div className={`text-lg font-semibold ${getSeerScoreColor(seerScore)}`}>
                {seerScore.toFixed(1)}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Volume</div>
            <div className="font-medium">{formatCurrency(vol)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">P&L</div>
            <div
              className={`font-medium ${
                pnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              }`}
            >
              {pnl >= 0 ? "+" : ""}
              {formatCurrency(pnl)}
            </div>
          </div>
          {trader.trades !== undefined && trader.trades !== null ? (
            <div>
              <div className="text-xs text-muted-foreground">Trades</div>
              <div className="font-medium">{trader.trades.toLocaleString()}</div>
            </div>
          ) : null}
        </div>

        <div className="flex gap-2 pt-2 border-t border-border">
          <Link
            href={`/trader/${address}`}
            className="flex-1 text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5"
          >
            Details
          </Link>
          {isSubscribed ? (
            <button
              onClick={handleUnsubscribe}
              disabled={unsubscribe.isPending}
              className="flex-1 text-xs text-green-600 dark:text-green-400 hover:opacity-80 transition-opacity py-1.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
            >
              {unsubscribe.isPending ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Stopping
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3 w-3" />
                  Copying
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleSubscribe}
              disabled={subscribe.isPending || !traderAddress}
              className="flex-1 text-xs text-foreground hover:opacity-80 transition-opacity py-1.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
            >
              {subscribe.isPending ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Starting
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </>
  );
}


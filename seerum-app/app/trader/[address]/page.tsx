"use client";

import {
  ArrowLeft,
  ExternalLink,
  Target,
  Award,
  Tag,
  Copy,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useTraderDetails } from "@/lib/hooks/useTraderDetails";
import { formatDistanceToNow } from "date-fns";
import { formatAddress, formatCurrency } from "@/lib/utils";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLeaderboard } from "@/lib/hooks/useLeaderboard";
import { useIsSubscribedToTrader, useSubscribeToTrader, useUnsubscribeFromTrader } from "@/lib/hooks/useCopyTrade";
import { Address } from "viem";

interface TradeActivity {
  timestamp?: string | number;
  match_time?: string | number;
  last_update?: string | number;
  type?: string;
  size?: string | number;
  usdcSize?: string | number;
  title?: string;
  marketTitle?: string;
  slug?: string;
  marketSlug?: string;
  icon?: string;
  marketIcon?: string;
  eventSlug?: string;
  transactionHash?: string;
  id?: string;
}

interface Position {
  cashPnl?: string | number;
  percentPnl?: string | number;
  currentValue?: string | number;
  size?: string | number;
  title?: string;
  outcome?: string;
  icon?: string;
  slug?: string;
  eventSlug?: string;
  redeemable?: boolean;
}

export default function TraderDetailPage() {
  const params = useParams();
  const address = params.address as string;
  const { data, isLoading, error } = useTraderDetails({
    address: address || "",
  });
  const [activeTab, setActiveTab] = useState<"trades" | "positions" | "categories">("trades");
  
  const traderAddress = address as Address;
  const isSubscribed = useIsSubscribedToTrader(traderAddress);
  const subscribe = useSubscribeToTrader();
  const unsubscribe = useUnsubscribeFromTrader();
  
  const handleSubscribe = async () => {
    if (!traderAddress) return;
    try {
      // Default to 100% copy percentage (can be made configurable later)
      await subscribe.mutateAsync({ traderAddress, percentage: 100 });
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

  // Fetch trader info from leaderboard to get profile image and name
  const { data: leaderboardData } = useLeaderboard({
    limit: 100,
    offset: 0,
  });
  
  const traderInfo = useMemo(() => {
    if (!leaderboardData?.data) return null;
    return leaderboardData.data.find(
      (t) => t.proxyWallet?.toLowerCase() === address?.toLowerCase() || 
             t.user?.toLowerCase() === address?.toLowerCase()
    );
  }, [leaderboardData, address]);

  const formatSize = (size: string | number | undefined | null) => {
    if (size === undefined || size === null) return "0.0000";
    const num = typeof size === "string" ? parseFloat(size) : size;
    if (isNaN(num)) return "0.0000";
    return num.toFixed(4);
  };

  // Sort categories by performance
  const sortedCategories = useMemo(() => {
    if (!data?.categoryStats) return [];
    return Object.entries(data.categoryStats)
      .map(([name, stats]: [string, { count: number; pnl: number; wins: number; losses: number }]) => ({
        name,
        ...stats,
        winRate: stats.count > 0 ? (stats.wins / stats.count) * 100 : 0,
      }))
      .sort((a, b) => b.pnl - a.pnl);
  }, [data?.categoryStats]);

  const displayName = traderInfo?.userName || formatAddress(address);
  const pnl = traderInfo ? (typeof traderInfo.pnl === 'number' ? traderInfo.pnl : parseFloat((traderInfo.pnl as number)?.toString() || "0")) : 0;
  const vol = traderInfo ? (typeof traderInfo.vol === 'number' ? traderInfo.vol : parseFloat((traderInfo.vol as number)?.toString() || "0")) : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Leaderboard
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
            {traderInfo?.profileImage && (
              <img
                src={traderInfo.profileImage}
                alt={displayName}
                className="w-20 h-20 rounded-full border border-border"
              />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold">{displayName}</h1>
                {isSubscribed ? (
                  <button
                    onClick={handleUnsubscribe}
                    disabled={unsubscribe.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {unsubscribe.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Stopping
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Copying
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleSubscribe}
                    disabled={subscribe.isPending || !traderAddress}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-black dark:bg-white dark:text-black hover:bg-black/90 dark:hover:bg-white/90 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {subscribe.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Starting
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="font-mono">{formatAddress(address)}</span>
                <a
                  href={`https://polymarket.com/profile/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  View on Polymarket
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="border border-border rounded-lg p-4">
              <div className="text-xs text-muted-foreground mb-1">Volume</div>
              <div className="text-lg font-semibold">{formatCurrency(vol)}</div>
            </div>
            <div className="border border-border rounded-lg p-4">
              <div className="text-xs text-muted-foreground mb-1">P&L</div>
              <div className={`text-lg font-semibold ${pnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {pnl >= 0 ? "+" : ""}{formatCurrency(pnl)}
              </div>
            </div>
            <div className="border border-border rounded-lg p-4">
              <div className="text-xs text-muted-foreground mb-1">Total Trades</div>
              <div className="text-lg font-semibold">{data?.trades.length || 0}</div>
            </div>
            <div className="border border-border rounded-lg p-4">
              <div className="text-xs text-muted-foreground mb-1">Win Rate</div>
              <div className="text-lg font-semibold">
                {data?.totalClosed && data.totalClosed > 0 
                  ? (((data.winningPositions && data.winningPositions > 0 ? data.winningPositions : 0) / (data.totalClosed && data.totalClosed > 0 ? data.totalClosed : 1)) * 100).toFixed(1) 
                  : "0.0"}%
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-border overflow-x-auto">
          {[
            { id: "trades", label: "Activity", icon: Target },
            { id: "positions", label: "Positions", icon: Award },
            { id: "categories", label: "Categories", icon: Tag },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-sm transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-foreground text-foreground font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading trader details...</div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-12">
            <div className="text-red-500">Failed to load trader details</div>
          </div>
        )}

        {data && (
          <>
            {activeTab === "trades" && (
              <div className="space-y-3">
                {data.trades.length === 0 ? (
                  <div className="text-center py-12 text-sm text-muted-foreground">No activity found</div>
                ) : (
                  data.trades.map((activity: TradeActivity, idx: number) => {
                    const timestamp = activity.timestamp || activity.match_time || activity.last_update;
                    const date = timestamp ? (typeof timestamp === 'number' ? new Date(timestamp * 1000) : new Date(timestamp)) : null;
                    const type = activity.type || "TRADE";
                    const size = parseFloat((activity.size as number)?.toString() || (activity.usdcSize as number)?.toString() || "0");
                    const title = activity.title || activity.marketTitle || "Unknown Market";
                    const slug = activity.slug || activity.marketSlug;
                    const icon = activity.icon || activity.marketIcon;
                    
                    return (
                      <div
                        key={activity.transactionHash || activity.id || idx}
                        className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          {icon && (
                            <img
                              src={icon}
                              alt={title}
                              className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h3 className="font-medium text-sm line-clamp-2">{title}</h3>
                              {slug && (
                          <a
                                  href={`https://polymarket.com/event/${activity.eventSlug || slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                                  className="flex-shrink-0"
                          >
                                  <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </a>
                              )}
                        </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="uppercase">{type}</span>
                              {size > 0 && (
                                <span>{formatCurrency(size)}</span>
                              )}
                              {date && (
                                <span>{formatDistanceToNow(date, { addSuffix: true })}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Positions Tab */}
            {activeTab === "positions" && (
              <div className="space-y-2">
                {data.positions && data.positions.length > 0 ? (
                  data.positions.map((position: Position, idx: number) => {
                    const cashPnl = parseFloat((position.cashPnl as number)?.toString() || "0");
                    const percentPnl = parseFloat((position.percentPnl as number)?.toString() || "0");
                    const currentValue = parseFloat((position.currentValue as number)?.toString() || "0");
                    const size = parseFloat((position.size as number)?.toString() || "0");
                    const marketTitle = position.title || "Unknown Market";
                    const outcome = position.outcome || "N/A";
                    const icon = position.icon;
                    const slug = position.slug;
                    const eventSlug = position.eventSlug;
                    
                    return (
                      <div
                        key={idx}
                        className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          {icon && (
                            <img
                              src={icon}
                              alt={marketTitle}
                              className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h3 className="font-medium text-sm line-clamp-2">{marketTitle}</h3>
                              {(slug || eventSlug) && (
                                <a
                                  href={`https://polymarket.com/event/${eventSlug || slug}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-shrink-0"
                                >
                                  <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                </a>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mb-3">
                              {outcome}
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <div className="text-xs text-muted-foreground mb-1">Size</div>
                                <div className="font-medium">{formatSize(size)}</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">Current Value</div>
                                <div className="font-medium">{formatCurrency(currentValue)}</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">P&L</div>
                                <div
                                  className={`font-semibold ${
                                    cashPnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                                  }`}
                                    >
                                  {cashPnl >= 0 ? "+" : ""}
                                  {formatCurrency(cashPnl)}
                                </div>
                            </div>
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">% P&L</div>
                            <div
                                  className={`font-semibold ${
                                    percentPnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                              }`}
                            >
                                  {percentPnl >= 0 ? "+" : ""}
                                  {percentPnl.toFixed(2)}%
                                </div>
                              </div>
                            </div>
                            {position.redeemable && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                Redeemable
                            </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : null}
              </div>
            )}

            {/* Categories Tab */}
            {activeTab === "categories" && (
              <div className="space-y-2">
                {sortedCategories.length === 0 ? (
                  <div className="text-center py-12 text-sm text-muted-foreground">
                    No category data available
                  </div>
                ) : (
                  sortedCategories.map((category) => (
                    <div
                      key={category.name}
                      className="border border-border rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-sm">{category.name}</h3>
                        <div
                          className={`text-sm font-semibold ${
                            category.pnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {formatCurrency(category.pnl)}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-xs">
                        <div>
                          <div className="text-muted-foreground">Trades</div>
                          <div className="font-medium">{category.count}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Win Rate</div>
                          <div className="font-medium">{category.winRate.toFixed(1)}%</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Wins / Losses</div>
                          <div className="font-medium">
                            {category.wins} / {category.losses}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}


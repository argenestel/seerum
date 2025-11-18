"use client";

import {
  ArrowLeft,
  ExternalLink,
  Target,
  BarChart3,
  Award,
  Tag,
} from "lucide-react";
import { useTraderDetails } from "@/lib/hooks/useTraderDetails";
import { formatDistanceToNow, format } from "date-fns";
import { formatAddress, formatCurrency } from "@/lib/utils";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLeaderboard } from "@/lib/hooks/useLeaderboard";

export default function TraderDetailPage() {
  const params = useParams();
  const address = params.address as string;
  const { data, isLoading, error } = useTraderDetails({
    address: address || "",
  });
  const [activeTab, setActiveTab] = useState<"overview" | "trades" | "positions" | "categories">("overview");

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

  const formatDate = (timestamp: string | number) => {
    try {
      const date = typeof timestamp === "string" ? new Date(timestamp) : new Date(timestamp * 1000);
      return format(date, "MMM dd, yyyy HH:mm");
    } catch {
      return "Unknown";
    }
  };

  const formatPrice = (price: string | number | undefined | null) => {
    if (price === undefined || price === null) return "$0.0000";
    const num = typeof price === "string" ? parseFloat(price) : price;
    if (isNaN(num)) return "$0.0000";
    return `$${num.toFixed(4)}`;
  };

  const formatSize = (size: string | number | undefined | null) => {
    if (size === undefined || size === null) return "0.0000";
    const num = typeof size === "string" ? parseFloat(size) : size;
    if (isNaN(num)) return "0.0000";
    return num.toFixed(4);
  };

  // Calculate additional stats
  const stats = useMemo(() => {
    if (!data) return null;

    const totalVolume = data.trades.reduce((sum: number, trade: any) => {
      const size = parseFloat(trade.size || "0");
      const price = parseFloat(trade.price || "0");
      return sum + size * price;
    }, 0);

    const totalRealizedPnl = data.closedPositions.reduce((sum: number, pos: any) => {
      return sum + parseFloat(pos.realizedPnl || pos.realized_pnl || "0");
    }, 0);

    const avgWin = data.closedPositions
      .filter((p: any) => parseFloat(p.realizedPnl || p.realized_pnl || "0") > 0)
      .reduce((sum: number, p: any) => sum + parseFloat(p.realizedPnl || p.realized_pnl || "0"), 0) /
      Math.max(data.winningPositions, 1);

    const avgLoss = data.closedPositions
      .filter((p: any) => parseFloat(p.realizedPnl || p.realized_pnl || "0") < 0)
      .reduce((sum: number, p: any) => sum + Math.abs(parseFloat(p.realizedPnl || p.realized_pnl || "0")), 0) /
      Math.max(data.totalClosed - data.winningPositions, 1);

    return {
      totalVolume,
      totalRealizedPnl,
      avgWin,
      avgLoss,
      winLossRatio: avgLoss > 0 ? avgWin / avgLoss : 0,
    };
  }, [data]);

  // Sort categories by performance
  const sortedCategories = useMemo(() => {
    if (!data?.categoryStats) return [];
    return Object.entries(data.categoryStats)
      .map(([name, stats]) => ({
        name,
        ...stats,
        winRate: stats.count > 0 ? (stats.wins / stats.count) * 100 : 0,
      }))
      .sort((a, b) => b.pnl - a.pnl);
  }, [data?.categoryStats]);

  const displayName = traderInfo?.userName || formatAddress(address);
  const pnl = traderInfo ? (typeof traderInfo.pnl === 'number' ? traderInfo.pnl : parseFloat(traderInfo.pnl?.toString() || "0")) : 0;
  const vol = traderInfo ? (typeof traderInfo.vol === 'number' ? traderInfo.vol : parseFloat(traderInfo.vol?.toString() || "0")) : 0;

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
              <h1 className="text-2xl md:text-3xl font-bold mb-2">{displayName}</h1>
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
                {data?.totalClosed > 0 
                  ? ((data.winningPositions / data.totalClosed) * 100).toFixed(1) 
                  : "0.0"}%
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-border overflow-x-auto">
          {[
            { id: "overview", label: "Overview", icon: BarChart3 },
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
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="border border-border rounded-lg p-4">
                    <div className="text-xs text-muted-foreground mb-1">Total P&L</div>
                    <div
                      className={`text-xl font-semibold ${
                        stats?.totalRealizedPnl && stats.totalRealizedPnl >= 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {stats?.totalRealizedPnl
                        ? formatCurrency(stats.totalRealizedPnl)
                        : "$0.00"}
                    </div>
                  </div>

                  <div className="border border-border rounded-lg p-4">
                    <div className="text-xs text-muted-foreground mb-1">Total Trades</div>
                    <div className="text-xl font-semibold">{data.trades.length}</div>
                  </div>

                  <div className="border border-border rounded-lg p-4">
                    <div className="text-xs text-muted-foreground mb-1">Win Rate</div>
                    <div className="text-xl font-semibold">
                      {data.totalClosed > 0 
                        ? ((data.winningPositions / data.totalClosed) * 100).toFixed(1) 
                        : "0.0"}%
                    </div>
                  </div>
                </div>

                {/* Top Categories */}
                {sortedCategories.length > 0 && (
                  <div className="border border-border rounded-lg p-4">
                    <h3 className="font-medium text-sm mb-3">Top Categories</h3>
                    <div className="space-y-2">
                      {sortedCategories.slice(0, 5).map((category) => (
                        <div
                          key={category.name}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-muted-foreground">{category.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">
                              {category.count} trades
                            </span>
                            <span
                              className={`font-medium ${
                                category.pnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              {formatCurrency(category.pnl)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Closed Positions */}
                {data.closedPositions.length > 0 && (
                  <div>
                    <h3 className="font-medium text-sm mb-3">Recent Positions</h3>
                    <div className="space-y-2">
                      {data.closedPositions.slice(0, 10).map((position: any, idx: number) => {
                        const pnl = parseFloat(position.realizedPnl || position.realized_pnl || "0");
                        // Try multiple keys to find market details
                        const marketKey = position.market || position.conditionId || position.condition_id;
                        const market = marketKey ? (
                          data.marketDetails[marketKey] ||
                          data.marketDetails[position.conditionId] ||
                          data.marketDetails[position.condition_id] ||
                          data.marketDetails[position.market]
                        ) : null;
                        const marketTitle = market?.question || market?.title || (marketKey ? formatAddress(marketKey) : "Unknown");
                        return (
                          <div
                            key={idx}
                            className="border border-border rounded-lg p-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">
                                {marketTitle}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {position.outcome || market?.outcomes?.[position.outcomeIndex] || "N/A"}
                              </div>
                            </div>
                            <div
                              className={`text-sm font-semibold ml-4 ${
                                pnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              {pnl >= 0 ? "+" : ""}
                              {formatCurrency(pnl)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Trades Tab */}
            {activeTab === "trades" && (
              <div className="space-y-3">
                {data.trades.length === 0 ? (
                  <div className="text-center py-12 text-sm text-muted-foreground">No activity found</div>
                ) : (
                  data.trades.map((activity: any, idx: number) => {
                    const timestamp = activity.timestamp || activity.match_time || activity.last_update;
                    const date = timestamp ? (typeof timestamp === 'number' ? new Date(timestamp * 1000) : new Date(timestamp)) : null;
                    const type = activity.type || "TRADE";
                    const size = parseFloat(activity.size || activity.usdcSize || "0");
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

            {/* Closed Positions Tab */}
            {activeTab === "positions" && (
              <div className="space-y-2">
                {data.closedPositions.length === 0 ? (
                  <div className="text-center py-12 text-sm text-muted-foreground">
                    No closed positions found
                  </div>
                ) : (
                  data.closedPositions.map((position: any, idx: number) => {
                    const pnl = parseFloat(position.realizedPnl || position.realized_pnl || "0");
                    // Try multiple keys to find market details
                    const marketKey = position.market || position.conditionId || position.condition_id;
                    const market = marketKey ? (
                      data.marketDetails[marketKey] ||
                      data.marketDetails[position.conditionId] ||
                      data.marketDetails[position.condition_id] ||
                      data.marketDetails[position.market]
                    ) : null;
                    const marketTitle = market?.question || market?.title || (marketKey ? formatAddress(marketKey) : "Unknown");
                    return (
                      <div
                        key={idx}
                        className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm mb-1">
                              {marketTitle}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {position.outcome || market?.outcomes?.[position.outcomeIndex] || "N/A"}
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <div
                              className={`text-sm font-semibold ${
                                pnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              {pnl >= 0 ? "+" : ""}
                              {formatCurrency(pnl)}
                            </div>
                            {position.size && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {formatSize(position.size)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
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


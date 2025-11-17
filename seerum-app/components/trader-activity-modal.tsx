"use client";

import {
  X,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Brain,
  Target,
  BarChart3,
  Award,
  Tag,
  Calendar,
  DollarSign,
} from "lucide-react";
import { LeaderboardEntry } from "@/lib/types/polymarket";
import { useTraderDetails } from "@/lib/hooks/useTraderDetails";
import { formatDistanceToNow, format } from "date-fns";
import { formatAddress, formatCurrency } from "@/lib/utils";
import { useState, useMemo } from "react";

interface TraderActivityModalProps {
  traderAddress: string;
  traderInfo: LeaderboardEntry;
  onClose: () => void;
}

export function TraderActivityModal({
  traderAddress,
  traderInfo,
  onClose,
}: TraderActivityModalProps) {
  const { data, isLoading, error } = useTraderDetails({
    address: traderAddress,
  });
  const [activeTab, setActiveTab] = useState<"overview" | "trades" | "positions" | "categories">("overview");

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-6xl max-h-[90vh] backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-border rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-4">
            {traderInfo.profileImage && (
              <img
                src={traderInfo.profileImage}
                alt={traderInfo.userName || "Trader"}
                className="w-12 h-12 rounded-full border border-border"
              />
            )}
            <div>
              <h2 className="text-2xl font-semibold mb-1">
                {traderInfo.userName || formatAddress(traderAddress)}
              </h2>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="font-mono">{formatAddress(traderAddress)}</span>
                <a
                  href={`https://polymarket.com/profile/${traderAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  View Profile
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 dark:hover:bg-black/10 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 p-4 border-b border-border">
          {[
            { id: "overview", label: "Overview", icon: BarChart3 },
            { id: "trades", label: "All Trades", icon: Target },
            { id: "positions", label: "Closed Positions", icon: Award },
            { id: "categories", label: "Categories", icon: Tag },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5 dark:hover:bg-black/5"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="backdrop-blur-md bg-white/5 dark:bg-black/5 rounded-lg p-4 border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="h-4 w-4 text-primary" />
                        <span className="text-sm text-muted-foreground">Trader IQ</span>
                      </div>
                      <div className="text-2xl font-bold">{data.traderIQ.toFixed(1)}%</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {data.winningPositions} wins / {data.totalClosed} closed
                      </div>
                    </div>

                    <div className="backdrop-blur-md bg-white/5 dark:bg-black/5 rounded-lg p-4 border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-4 w-4 text-primary" />
                        <span className="text-sm text-muted-foreground">Total P&L</span>
                      </div>
                      <div
                        className={`text-2xl font-bold ${
                          stats?.totalRealizedPnl && stats.totalRealizedPnl >= 0
                            ? "text-green-500"
                            : "text-red-500"
                        }`}
                      >
                        {stats?.totalRealizedPnl
                          ? formatCurrency(stats.totalRealizedPnl)
                          : "$0.00"}
                      </div>
                    </div>

                    <div className="backdrop-blur-md bg-white/5 dark:bg-black/5 rounded-lg p-4 border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="h-4 w-4 text-primary" />
                        <span className="text-sm text-muted-foreground">Total Trades</span>
                      </div>
                      <div className="text-2xl font-bold">{data.trades.length}</div>
                    </div>

                    <div className="backdrop-blur-md bg-white/5 dark:bg-black/5 rounded-lg p-4 border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <Award className="h-4 w-4 text-primary" />
                        <span className="text-sm text-muted-foreground">Win/Loss Ratio</span>
                      </div>
                      <div className="text-2xl font-bold">
                        {stats?.winLossRatio ? stats.winLossRatio.toFixed(2) : "0.00"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Avg Win: {stats?.avgWin ? formatCurrency(stats.avgWin) : "$0"}
                      </div>
                    </div>
                  </div>

                  {/* Top Categories */}
                  {sortedCategories.length > 0 && (
                    <div className="backdrop-blur-md bg-white/5 dark:bg-black/5 rounded-lg p-4 border border-border">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        Top Trading Categories
                      </h3>
                      <div className="space-y-2">
                        {sortedCategories.slice(0, 5).map((category) => (
                          <div
                            key={category.name}
                            className="flex items-center justify-between p-2 rounded bg-white/5 dark:bg-black/5"
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-medium">{category.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {category.count} positions
                              </span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span
                                className={`text-sm font-medium ${
                                  category.pnl >= 0 ? "text-green-500" : "text-red-500"
                                }`}
                              >
                                {formatCurrency(category.pnl)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {category.winRate.toFixed(1)}% win rate
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
                      <h3 className="font-semibold mb-4">Recent Wins & Losses</h3>
                      <div className="space-y-2">
                        {data.closedPositions.slice(0, 5).map((position: any, idx: number) => {
                          const pnl = parseFloat(position.realizedPnl || position.realized_pnl || "0");
                          const market = data.marketDetails[position.market];
                          return (
                            <div
                              key={idx}
                              className="backdrop-blur-md bg-white/5 dark:bg-black/5 rounded-lg p-3 border border-border flex items-center justify-between"
                            >
                              <div className="flex items-center gap-3">
                                {pnl >= 0 ? (
                                  <TrendingUp className="h-5 w-5 text-green-500" />
                                ) : (
                                  <TrendingDown className="h-5 w-5 text-red-500" />
                                )}
                                <div>
                                  <div className="font-medium">
                                    {market?.question || formatAddress(position.market)}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {position.outcome || "N/A"}
                                  </div>
                                </div>
                              </div>
                              <div
                                className={`font-semibold ${
                                  pnl >= 0 ? "text-green-500" : "text-red-500"
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
                    <div className="text-center py-12 text-muted-foreground">No trades found</div>
                  ) : (
                    data.trades.map((trade: any, idx: number) => {
                      const market = data.marketDetails[trade.market];
                      return (
                        <div
                          key={trade.id || idx}
                          className="backdrop-blur-md bg-white/5 dark:bg-black/5 rounded-lg p-4 border border-border hover:bg-white/10 dark:hover:bg-black/10 transition-all"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              {trade.side === "BUY" ? (
                                <TrendingUp className="h-5 w-5 text-green-500" />
                              ) : (
                                <TrendingDown className="h-5 w-5 text-red-500" />
                              )}
                              <div>
                                <div className="font-semibold">
                                  {trade.side} {trade.outcome || "N/A"}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {market?.question || formatAddress(trade.market)}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {formatDate(trade.match_time || trade.last_update)}
                                </div>
                              </div>
                            </div>
                            <a
                              href={`https://polymarket.com/market/${trade.market}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 hover:bg-white/10 rounded transition-all"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>

                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <div className="text-muted-foreground mb-1">Size</div>
                              <div className="font-medium">{formatSize(trade.size)}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground mb-1">Price</div>
                              <div className="font-medium">{formatPrice(trade.price)}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground mb-1">Value</div>
                              <div className="font-medium">
                                {formatCurrency(
                                  parseFloat(trade.size || "0") * parseFloat(trade.price || "0")
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
                <div className="space-y-3">
                  {data.closedPositions.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      No closed positions found
                    </div>
                  ) : (
                    data.closedPositions.map((position: any, idx: number) => {
                      const pnl = parseFloat(position.realizedPnl || position.realized_pnl || "0");
                      const market = data.marketDetails[position.market];
                      return (
                        <div
                          key={idx}
                          className="backdrop-blur-md bg-white/5 dark:bg-black/5 rounded-lg p-4 border border-border hover:bg-white/10 dark:hover:bg-black/10 transition-all"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              {pnl >= 0 ? (
                                <Award className="h-5 w-5 text-green-500" />
                              ) : (
                                <Award className="h-5 w-5 text-red-500" />
                              )}
                              <div>
                                <div className="font-semibold">
                                  {market?.question || formatAddress(position.market)}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {position.outcome || "N/A"}
                                </div>
                                {market?.tags && market.tags.length > 0 && (
                                  <div className="flex items-center gap-2 mt-2">
                                    {market.tags.slice(0, 3).map((tag: any, tagIdx: number) => (
                                      <span
                                        key={tagIdx}
                                        className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary"
                                      >
                                        {tag.name || tag.slug}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div
                                className={`text-xl font-bold ${
                                  pnl >= 0 ? "text-green-500" : "text-red-500"
                                }`}
                              >
                                {pnl >= 0 ? "+" : ""}
                                {formatCurrency(pnl)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Size: {formatSize(position.size)}
                              </div>
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
                <div className="space-y-4">
                  {sortedCategories.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      No category data available
                    </div>
                  ) : (
                    sortedCategories.map((category) => (
                      <div
                        key={category.name}
                        className="backdrop-blur-md bg-white/5 dark:bg-black/5 rounded-lg p-4 border border-border"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold text-lg">{category.name}</h3>
                          <div
                            className={`text-lg font-bold ${
                              category.pnl >= 0 ? "text-green-500" : "text-red-500"
                            }`}
                          >
                            {formatCurrency(category.pnl)}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <div className="text-sm text-muted-foreground">Positions</div>
                            <div className="font-semibold">{category.count}</div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Win Rate</div>
                            <div className="font-semibold">{category.winRate.toFixed(1)}%</div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Wins / Losses</div>
                            <div className="font-semibold">
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
    </div>
  );
}

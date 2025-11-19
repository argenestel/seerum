"use client";

import { useAccount } from "wagmi";
import { useUserProfile } from "@/lib/hooks/useUserProfile";
import { useSafeWalletStatus } from "@/lib/hooks/useSafeWallet";
import { useVault, useSafeAddress } from "@/lib/hooks/useVault";
import { formatAddress, formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Activity,
  ExternalLink,
  Wallet,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { CopyTrading } from "@/components/my-subscriptions";
import { VaultWallet } from "@/components/vault-wallet";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const { data: vaultInfo } = useVault();
  const { data: safeInfo } = useSafeAddress(vaultInfo?.vaultAddress);
  
  // Use vault's safe address for stats, fallback to connected wallet
  const statsAddress = safeInfo?.safeAddress || address || "";
  
  const { data: userProfile, isLoading: loadingProfile } = useUserProfile({
    address: statsAddress,
  });
  
  // Show loading if we're waiting for vault info (but not if it's null because it doesn't exist)
  const isLoadingVaultInfo = vaultInfo === undefined && address;
  const { data: safeStatus, isLoading: checkingSafe } = useSafeWalletStatus();

  // Prepare P&L chart data from API
  const pnlChartData = useMemo(() => {
    if (!userProfile?.pnlData || userProfile.pnlData.length === 0) {
      return [];
    }

    return userProfile.pnlData
      .map((point) => {
        try {
          const timestamp = point.t * 1000;
          const date = new Date(timestamp);
          if (isNaN(date.getTime())) {
            return null;
          }
          return {
            date: format(date, "MMM dd"),
            timestamp,
            pnl: point.p,
          };
        } catch {
          return null;
        }
      })
      .filter((point): point is { date: string; timestamp: number; pnl: number } => point !== null)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [userProfile?.pnlData]);

  // Prepare chart data from activity for volume
  const volumeChartData = useMemo(() => {
    if (!userProfile?.activity || userProfile.activity.length === 0) {
      return [];
    }

    // Group trades by date and calculate daily volume
    const dailyData: Record<string, { date: string; volume: number; trades: number }> = {};

    userProfile.activity.forEach((trade) => {
      // Safely parse date with validation
      const timestamp = trade.match_time || trade.last_update;
      if (!timestamp) return; // Skip if no timestamp
      
      let date: Date;
      try {
        // Handle both string and number timestamps
        if (typeof timestamp === 'number') {
          date = new Date(timestamp * 1000); // Assume seconds if number
        } else {
          date = new Date(timestamp);
        }
        
        // Validate date
        if (isNaN(date.getTime())) {
          return; // Skip invalid dates
        }
      } catch {
        return; // Skip if date parsing fails
      }

      const dateStr = format(date, "MMM dd");
      if (!dailyData[dateStr]) {
        dailyData[dateStr] = { date: dateStr, volume: 0, trades: 0 };
      }

      const size = parseFloat(trade.size || "0");
      const price = parseFloat(trade.price || "0");
      const volume = size * price;
      dailyData[dateStr].volume += volume;
      dailyData[dateStr].trades += 1;
    });

    return Object.values(dailyData).sort((a, b) => {
      try {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      } catch {
        return 0;
      }
    });
  }, [userProfile?.activity]);

  const profile = userProfile?.profile;
  const activity = userProfile?.activity || [];
  const closedPositions = userProfile?.closedPositions || [];
  const positions = userProfile?.positions || [];

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Wallet Not Connected</h2>
              <p className="text-muted-foreground">
                Please connect your wallet to view your profile
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <h1 className="text-3xl font-semibold">Profile</h1>
        </div>

        {(loadingProfile || isLoadingVaultInfo) ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="h-8 w-8 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">
                {isLoadingVaultInfo ? "Loading vault information..." : "Loading profile..."}
              </p>
            </div>
          </div>
        ) : !statsAddress ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2">No Address Available</h2>
              <p className="text-muted-foreground">
                Please connect your wallet or set up a vault to view your profile
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Profile Header */}
            <div className="rounded-lg border border-border bg-card p-6 mb-6">
              <div className="flex items-center gap-4">
                {profile?.profileImage ? (
                  <img
                    src={profile.profileImage}
                    alt={profile.userName || "Profile"}
                    className="w-16 h-16 rounded-full border border-border"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-muted border border-border flex items-center justify-center">
                    <Wallet className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-semibold truncate">
                      {profile?.userName || formatAddress(address || "")}
                    </h2>
                    {profile?.verifiedBadge && (
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {safeInfo?.safeAddress && (
                      <span className="font-mono text-xs">{formatAddress(safeInfo.safeAddress)}</span>
                    )}
                    {profile?.rank && (
                      <span>Rank #{profile.rank}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <a
                    href={`https://polymarket.com/profile/${profile?.proxyWallet || safeInfo?.safeAddress || statsAddress || address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"
                    title="View on Polymarket"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground mb-1">Volume</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(profile?.vol || 0)}
                </p>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground mb-1">P&L</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(profile?.pnl || 0)}
                </p>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground mb-1">ROI</p>
                <p className="text-lg font-semibold">
                  {profile?.roi ? `${profile.roi.toFixed(1)}%` : "0%"}
                </p>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground mb-1">Trades</p>
                <p className="text-lg font-semibold">{activity.length}</p>
              </div>
            </div>

            {/* Vault Wallet */}
            <VaultWallet />

            {/* Copy Trading */}
            <CopyTrading />
<br />
  

            {/* Charts */}
            {pnlChartData.length > 0 || volumeChartData.length > 0 ? (
              <div className="space-y-4 mb-6">
                {/* P&L Chart from API */}
                {pnlChartData.length > 0 && (
                  <div className="rounded-lg border border-border bg-card p-4">
                    <h3 className="text-sm font-medium mb-4">P&L Over Time</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={pnlChartData}>
                        <defs>
                          <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                        <XAxis dataKey="date" stroke="currentColor" opacity={0.7} />
                        <YAxis stroke="currentColor" opacity={0.7} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(0, 0, 0, 0.8)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            borderRadius: "8px",
                          }}
                          formatter={(value: number) => formatCurrency(value)}
                        />
                        <Area
                          type="monotone"
                          dataKey="pnl"
                          stroke="#8884d8"
                          fillOpacity={1}
                          fill="url(#colorPnl)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Volume Chart */}
                {volumeChartData.length > 0 && (
                  <div className="rounded-lg border border-border bg-card p-4">
                    <h3 className="text-sm font-medium mb-4">Trading Volume</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={volumeChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                        <XAxis dataKey="date" stroke="currentColor" opacity={0.7} />
                        <YAxis stroke="currentColor" opacity={0.7} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(0, 0, 0, 0.8)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            borderRadius: "8px",
                          }}
                          formatter={(value: number) => formatCurrency(value)}
                        />
                        <Bar dataKey="volume" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-card p-8 text-center mb-6">
                <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No trading activity yet
                </p>
              </div>
            )}

            {/* Current Positions */}
            {positions.length > 0 && (
              <div className="rounded-lg border border-border bg-card p-4 mb-6">
                <h3 className="text-sm font-medium mb-4">Current Positions</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                          Market
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                          Outcome
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                          Size
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                          Current Price
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                          Unrealized P&L
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.slice(0, 10).map((position, idx) => (
                        <tr
                          key={idx}
                          className="border-b border-border hover:bg-muted/50"
                        >
                          <td className="py-3 px-4 text-sm">
                            <a
                              href={`https://polymarket.com/market/${position.market}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1"
                            >
                              {formatAddress(position.market)}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </td>
                          <td className="py-3 px-4 text-sm">{position.outcome || "N/A"}</td>
                          <td className="py-3 px-4 text-sm">
                            {parseFloat(position.size || "0").toFixed(4)}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {position.currentPrice
                              ? `$${parseFloat(position.currentPrice).toFixed(2)}`
                              : "N/A"}
                          </td>
                          <td className="py-3 px-4 text-sm font-medium">
                            {position.unrealizedPnl
                              ? formatCurrency(position.unrealizedPnl)
                              : "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Closed Positions */}
            {closedPositions.length > 0 && (
              <div className="rounded-lg border border-border bg-card p-4 mb-6">
                <h3 className="text-sm font-medium mb-4">Closed Positions</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                          Market
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                          Outcome
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                          Size
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                          Realized P&L
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {closedPositions.slice(0, 10).map((position, idx) => (
                        <tr
                          key={idx}
                          className="border-b border-border hover:bg-muted/50"
                        >
                          <td className="py-3 px-4 text-sm">
                            <a
                              href={`https://polymarket.com/market/${position.market}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1"
                            >
                              {formatAddress(position.market)}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </td>
                          <td className="py-3 px-4 text-sm">{position.outcome || "N/A"}</td>
                          <td className="py-3 px-4 text-sm">
                            {parseFloat(position.size || "0").toFixed(4)}
                          </td>
                          <td className="py-3 px-4 text-sm font-medium">
                            {position.realizedPnl
                              ? formatCurrency(position.realizedPnl)
                              : "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Recent Activity */}
            {activity.length > 0 && (
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="text-sm font-medium mb-4">Recent Activity</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                          Date
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                          Side
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                          Size
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                          Price
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                          Market
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {activity.slice(0, 10).map((trade) => (
                        <tr
                          key={trade.id || trade.taker_order_id}
                          className="border-b border-border hover:bg-muted/50"
                        >
                          <td className="py-3 px-4 text-sm">
                            {(() => {
                              try {
                                const timestamp = trade.match_time || trade.last_update;
                                if (!timestamp) return "N/A";
                                
                                let date: Date;
                                if (typeof timestamp === 'number') {
                                  date = new Date(timestamp * 1000);
                                } else {
                                  date = new Date(timestamp);
                                }
                                
                                if (isNaN(date.getTime())) return "N/A";
                                return format(date, "MMM dd, yyyy HH:mm");
                              } catch {
                                return "N/A";
                              }
                            })()}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium border border-border">
                              {trade.side}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm">{parseFloat(trade.size || "0").toFixed(4)}</td>
                          <td className="py-3 px-4 text-sm">
                            ${parseFloat(trade.price || "0").toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <a
                              href={`https://polymarket.com/market/${trade.market}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1"
                            >
                              {formatAddress(trade.market)}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}


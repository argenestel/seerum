"use client";

import { useAccount } from "wagmi";
import { useUserProfile } from "@/lib/hooks/useUserProfile";
import { useSafeWalletStatus } from "@/lib/hooks/useSafeWallet";
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
  const { data: userProfile, isLoading: loadingProfile } = useUserProfile({
    address: address || "",
  });
  const { data: safeStatus, isLoading: checkingSafe } = useSafeWalletStatus();

  // Prepare P&L chart data from API
  const pnlChartData = useMemo(() => {
    if (!userProfile?.pnlData || userProfile.pnlData.length === 0) {
      return [];
    }

    return userProfile.pnlData
      .map((point) => ({
        date: format(new Date(point.t * 1000), "MMM dd"),
        timestamp: point.t * 1000,
        pnl: point.p,
      }))
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
      const date = format(new Date(trade.match_time || trade.last_update), "MMM dd");
      if (!dailyData[date]) {
        dailyData[date] = { date, volume: 0, trades: 0 };
      }

      const size = parseFloat(trade.size || "0");
      const price = parseFloat(trade.price || "0");
      const volume = size * price;
      dailyData[date].volume += volume;
      dailyData[date].trades += 1;
    });

    return Object.values(dailyData).sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
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
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <h1 className="text-4xl font-bold mb-2">Profile</h1>
          <p className="text-muted-foreground">Your Polymarket trading statistics and activity</p>
        </div>

        {loadingProfile ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="h-8 w-8 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading profile...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Profile Header */}
            <div className="backdrop-blur-xl bg-white/5 dark:bg-black/5 border border-border rounded-2xl p-6 mb-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                {profile?.profileImage ? (
                  <img
                    src={profile.profileImage}
                    alt={profile.userName || "Profile"}
                    className="w-24 h-24 rounded-full border-2 border-border"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-muted border-2 border-border flex items-center justify-center">
                    <Wallet className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-semibold">
                      {profile?.userName || formatAddress(address || "")}
                    </h2>
                    {profile?.verifiedBadge && (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    )}
                    {profile?.xUsername && (
                      <span className="text-sm text-muted-foreground">@{profile.xUsername}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                    <span className="font-mono">{formatAddress(address || "")}</span>
                    {profile?.rank && (
                      <span>Rank: #{profile.rank}</span>
                    )}
                  </div>
                  <div className="flex gap-4">
                    <a
                      href={`https://polymarket.com/profile/${profile?.proxyWallet || address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      View on Polymarket
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <a
                      href={`https://polygonscan.com/address/${address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      View on PolygonScan
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="backdrop-blur-xl bg-white/5 dark:bg-black/5 border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Total Volume</span>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">
                  {formatCurrency(profile?.vol || 0)}
                </p>
              </div>

              <div className="backdrop-blur-xl bg-white/5 dark:bg-black/5 border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Total P&L</span>
                  {profile && (profile.pnl || 0) >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <p
                  className={`text-2xl font-bold ${
                    profile && (profile.pnl || 0) >= 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {formatCurrency(profile?.pnl || 0)}
                </p>
              </div>

              <div className="backdrop-blur-xl bg-white/5 dark:bg-black/5 border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">ROI</span>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </div>
                <p
                  className={`text-2xl font-bold ${
                    profile && (profile.roi || 0) >= 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {profile?.roi ? `${profile.roi.toFixed(2)}%` : "0%"}
                </p>
              </div>

              <div className="backdrop-blur-xl bg-white/5 dark:bg-black/5 border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Total Trades</span>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">{activity.length}</p>
              </div>
            </div>

            {/* Vault Wallet */}
            <VaultWallet />

            {/* Copy Trading */}
            <CopyTrading />

            {/* Safe Wallet Status */}
            {checkingSafe ? (
              <div className="backdrop-blur-xl bg-white/5 dark:bg-black/5 border border-border rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Checking Safe wallet...</span>
                </div>
              </div>
            ) : safeStatus?.exists && safeStatus?.isSafe ? (
              <div className="backdrop-blur-xl bg-white/5 dark:bg-black/5 border border-border rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="font-medium">Safe Wallet Connected</span>
                  </div>
                  <span className="text-sm text-muted-foreground font-mono">
                    {formatAddress(safeStatus.address)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="backdrop-blur-xl bg-white/5 dark:bg-black/5 border border-border rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    <span className="font-medium">No Safe Wallet</span>
                  </div>
                  <a
                    href="https://polymarket.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    Create Account
                  </a>
                </div>
              </div>
            )}

            {/* Charts */}
            {pnlChartData.length > 0 || volumeChartData.length > 0 ? (
              <div className="space-y-6 mb-6">
                {/* P&L Chart from API */}
                {pnlChartData.length > 0 && (
                  <div className="backdrop-blur-xl bg-white/5 dark:bg-black/5 border border-border rounded-xl p-6">
                    <h3 className="text-xl font-semibold mb-4">P&L Over Time</h3>
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
                  <div className="backdrop-blur-xl bg-white/5 dark:bg-black/5 border border-border rounded-xl p-6">
                    <h3 className="text-xl font-semibold mb-4">Trading Volume</h3>
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
              <div className="backdrop-blur-xl bg-white/5 dark:bg-black/5 border border-border rounded-xl p-12 text-center mb-6">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Trading Activity</h3>
                <p className="text-muted-foreground">
                  Start trading on Polymarket to see your statistics and charts here
                </p>
              </div>
            )}

            {/* Current Positions */}
            {positions.length > 0 && (
              <div className="backdrop-blur-xl bg-white/5 dark:bg-black/5 border border-border rounded-xl p-6 mb-6">
                <h3 className="text-xl font-semibold mb-4">Current Positions</h3>
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
                          className="border-b border-border hover:bg-white/5 dark:hover:bg-black/5"
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
                          <td
                            className={`py-3 px-4 text-sm font-medium ${
                              position.unrealizedPnl &&
                              parseFloat(position.unrealizedPnl) >= 0
                                ? "text-green-500"
                                : "text-red-500"
                            }`}
                          >
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
              <div className="backdrop-blur-xl bg-white/5 dark:bg-black/5 border border-border rounded-xl p-6 mb-6">
                <h3 className="text-xl font-semibold mb-4">Closed Positions</h3>
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
                          className="border-b border-border hover:bg-white/5 dark:hover:bg-black/5"
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
                          <td
                            className={`py-3 px-4 text-sm font-medium ${
                              position.realizedPnl && parseFloat(position.realizedPnl) >= 0
                                ? "text-green-500"
                                : "text-red-500"
                            }`}
                          >
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
              <div className="backdrop-blur-xl bg-white/5 dark:bg-black/5 border border-border rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-4">Recent Activity</h3>
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
                          className="border-b border-border hover:bg-white/5 dark:hover:bg-black/5"
                        >
                          <td className="py-3 px-4 text-sm">
                            {format(
                              new Date(trade.match_time || trade.last_update),
                              "MMM dd, yyyy HH:mm"
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                trade.side === "BUY"
                                  ? "bg-green-500/20 text-green-500"
                                  : "bg-red-500/20 text-red-500"
                              }`}
                            >
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


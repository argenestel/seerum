"use client";

import { useLeaderboard } from "@/lib/hooks/useLeaderboard";
import { TraderCard } from "./trader-card";
import { Loader2 } from "lucide-react";
import { useState } from "react";

export function Leaderboard() {
  const [timePeriod, setTimePeriod] = useState<"day" | "week" | "month" | "all">("day");
  const [orderBy, setOrderBy] = useState<"VOL" | "PNL" | "ROI">("VOL");

  const { data, isLoading, error } = useLeaderboard({
    timePeriod,
    orderBy,
    limit: 10,
    offset: 0,
    category: "overall",
  });

  const handleCopyTrade = (address: string) => {
    // TODO: Implement copy trading logic
    console.log("Copy trading for:", address);
    // This will be implemented with Polymarket CLOB client
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 backdrop-blur-md bg-white/20 dark:bg-black/20 rounded-lg p-1 border border-border">
          <button
            onClick={() => setTimePeriod("day")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              timePeriod === "day"
                ? "bg-white dark:bg-white/10 text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Day
          </button>
          <button
            onClick={() => setTimePeriod("week")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              timePeriod === "week"
                ? "bg-white dark:bg-white/10 text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setTimePeriod("month")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              timePeriod === "month"
                ? "bg-white dark:bg-white/10 text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setTimePeriod("all")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              timePeriod === "all"
                ? "bg-white dark:bg-white/10 text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Time
          </button>
        </div>

        <div className="flex items-center gap-2 backdrop-blur-md bg-white/20 dark:bg-black/20 rounded-lg p-1 border border-border">
          <button
            onClick={() => setOrderBy("VOL")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              orderBy === "VOL"
                ? "bg-white dark:bg-white/10 text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Volume
          </button>
          <button
            onClick={() => setOrderBy("PNL")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              orderBy === "PNL"
                ? "bg-white dark:bg-white/10 text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            P&L
          </button>
          <button
            onClick={() => setOrderBy("ROI")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              orderBy === "ROI"
                ? "bg-white dark:bg-white/10 text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            ROI
          </button>
        </div>
      </div>

      {/* Leaderboard Content */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center py-12">
          <div className="text-red-500">Failed to load leaderboard</div>
        </div>
      )}

      {data && data.data && data.data.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {data.data.map((trader, index) => {
            const traderKey = trader.proxyWallet || trader.user || `trader-${index}`;
            const traderRank = typeof trader.rank === 'string' ? parseInt(trader.rank) : (trader.rank || index + 1);
            return (
              <TraderCard
                key={traderKey}
                trader={trader}
                rank={traderRank}
                onCopyTrade={handleCopyTrade}
              />
            );
          })}
        </div>
      )}

      {data && data.data && data.data.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">No traders found</div>
        </div>
      )}
    </div>
  );
}


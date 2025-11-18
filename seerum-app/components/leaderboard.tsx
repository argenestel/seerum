"use client";

import { useLeaderboard } from "@/lib/hooks/useLeaderboard";
import { TraderCard } from "./trader-card";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

export function Leaderboard() {
  const [orderBy, setOrderBy] = useState<"seerscore" | "rank_overall" | "pnl_usd_approx" | "volume_usd">("seerscore");
  const [maxRank, setMaxRank] = useState<number | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 20;

  const { data, isLoading, error } = useLeaderboard({
    orderBy,
    limit: itemsPerPage,
    offset: currentPage * itemsPerPage,
    maxRank,
  });

  const totalPages = data?.total ? Math.ceil(data.total / itemsPerPage) : 0;
  const hasNextPage = currentPage < totalPages - 1;
  const hasPrevPage = currentPage > 0;


  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Rank Filter */}
        <div className="flex items-center gap-1 border border-border rounded-md p-1">
          <button
            onClick={() => {
              setMaxRank(undefined);
              setCurrentPage(0);
            }}
            className={`px-3 py-1.5 rounded text-sm transition-colors ${
              maxRank === undefined
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
          <button
            onClick={() => {
              setMaxRank(20);
              setCurrentPage(0);
            }}
            className={`px-3 py-1.5 rounded text-sm transition-colors ${
              maxRank === 20
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Top 20
          </button>
          <button
            onClick={() => {
              setMaxRank(50);
              setCurrentPage(0);
            }}
            className={`px-3 py-1.5 rounded text-sm transition-colors ${
              maxRank === 50
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Top 50
          </button>
          <button
            onClick={() => {
              setMaxRank(100);
              setCurrentPage(0);
            }}
            className={`px-3 py-1.5 rounded text-sm transition-colors ${
              maxRank === 100
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Top 100
          </button>
        </div>

        {/* Sort By Filter */}
        <div className="flex items-center gap-1 border border-border rounded-md p-1">
          <button
            onClick={() => {
              setOrderBy("seerscore");
              setCurrentPage(0);
            }}
            className={`px-3 py-1.5 rounded text-sm transition-colors ${
              orderBy === "seerscore"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Seer Score
          </button>
          <button
            onClick={() => {
              setOrderBy("rank_overall");
              setCurrentPage(0);
            }}
            className={`px-3 py-1.5 rounded text-sm transition-colors ${
              orderBy === "rank_overall"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Rank
          </button>
          <button
            onClick={() => {
              setOrderBy("pnl_usd_approx");
              setCurrentPage(0);
            }}
            className={`px-3 py-1.5 rounded text-sm transition-colors ${
              orderBy === "pnl_usd_approx"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            P&L
          </button>
          <button
            onClick={() => {
              setOrderBy("volume_usd");
              setCurrentPage(0);
            }}
            className={`px-3 py-1.5 rounded text-sm transition-colors ${
              orderBy === "volume_usd"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Volume
          </button>
        </div>
      </div>

      {/* Results Count */}
      {data && data.total !== undefined && (
        <div className="text-xs text-muted-foreground">
          {currentPage * itemsPerPage + 1} - {Math.min((currentPage + 1) * itemsPerPage, data.total)} of {data.total}
        </div>
      )}

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
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.data.map((trader, index) => {
            const traderKey = trader.proxyWallet || trader.user || `trader-${index}`;
            const traderRank = typeof trader.rank === 'string' ? parseInt(trader.rank) : (trader.rank || index + 1);
              
            return (
              <TraderCard
                key={traderKey}
                trader={trader}
                rank={traderRank}
              />
            );
          })}
        </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                disabled={!hasPrevPage}
                className="px-3 py-1.5 border border-border rounded text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-muted"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i;
                  } else if (currentPage < 3) {
                    pageNum = i;
                  } else if (currentPage > totalPages - 4) {
                    pageNum = totalPages - 5 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1.5 rounded text-sm transition-colors border ${
                        currentPage === pageNum
                          ? "bg-foreground text-background border-transparent"
                          : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      {pageNum + 1}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))}
                disabled={!hasNextPage}
                className="px-3 py-1.5 border border-border rounded text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-muted"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}

      {data && data.data && data.data.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">No traders found</div>
        </div>
      )}
    </div>
  );
}


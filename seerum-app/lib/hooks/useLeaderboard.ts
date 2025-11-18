import { useQuery } from "@tanstack/react-query";
import { LeaderboardResponse } from "../types/polymarket";

interface UseLeaderboardOptions {
  timePeriod?: "day" | "week" | "month" | "all";
  orderBy?: "VOL" | "PNL" | "ROI" | "seerscore" | "rank_overall" | "pnl_usd_approx" | "volume_usd";
  limit?: number;
  offset?: number;
  category?: string;
  minSeerScore?: number;
  maxRank?: number;
}

export function useLeaderboard(options: UseLeaderboardOptions = {}) {
  const {
    timePeriod = "day",
    orderBy = "seerscore",
    limit = 20,
    offset = 0,
    category = "overall",
    minSeerScore,
    maxRank,
  } = options;

  return useQuery<LeaderboardResponse & { total?: number; offset?: number; limit?: number }>({
    queryKey: ["leaderboard", orderBy, limit, offset, minSeerScore, maxRank],
    queryFn: async () => {
      const params = new URLSearchParams({
        orderBy,
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (minSeerScore !== undefined) {
        params.append("minSeerScore", minSeerScore.toString());
      }

      if (maxRank !== undefined) {
        params.append("maxRank", maxRank.toString());
      }

      const response = await fetch(`/api/analyzed-wallets?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch leaderboard");
      }
      return response.json();
    },
    refetchInterval: 60000, // Refetch every 60 seconds
  });
}


import { useQuery } from "@tanstack/react-query";
import { LeaderboardResponse } from "../types/polymarket";

interface UseLeaderboardOptions {
  timePeriod?: "day" | "week" | "month" | "all";
  orderBy?: "VOL" | "PNL" | "ROI";
  limit?: number;
  offset?: number;
  category?: string;
}

export function useLeaderboard(options: UseLeaderboardOptions = {}) {
  const {
    timePeriod = "day",
    orderBy = "VOL",
    limit = 10,
    offset = 0,
    category = "overall",
  } = options;

  return useQuery<LeaderboardResponse>({
    queryKey: ["leaderboard", timePeriod, orderBy, limit, offset, category],
    queryFn: async () => {
      const params = new URLSearchParams({
        timePeriod,
        orderBy,
        limit: limit.toString(),
        offset: offset.toString(),
        category,
      });

      const response = await fetch(`/api/leaderboard?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch leaderboard");
      }
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}


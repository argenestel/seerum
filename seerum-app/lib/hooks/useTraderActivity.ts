import { useQuery } from "@tanstack/react-query";
import { TraderActivity } from "../types/polymarket";

interface UseTraderActivityOptions {
  address: string;
  market?: string;
  limit?: number;
  offset?: number;
}

export function useTraderActivity(options: UseTraderActivityOptions) {
  const { address, market, limit = 50, offset = 0 } = options;

  return useQuery<TraderActivity>({
    queryKey: ["traderActivity", address, market, limit, offset],
    queryFn: async () => {
      const params = new URLSearchParams({
        address,
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (market) {
        params.append("market", market);
      }

      const response = await fetch(`/api/trader/activity?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch trader activity");
      }
      return response.json();
    },
    enabled: !!address,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}


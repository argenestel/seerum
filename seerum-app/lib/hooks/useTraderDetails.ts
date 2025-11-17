import { useQuery } from "@tanstack/react-query";

interface TraderDetails {
  closedPositions: any[];
  positions: any[];
  trades: any[];
  marketDetails: Record<string, any>;
  categoryStats: Record<string, { count: number; pnl: number; wins: number; losses: number }>;
  traderIQ: number;
  totalClosed: number;
  winningPositions: number;
}

interface UseTraderDetailsOptions {
  address: string;
}

export function useTraderDetails(options: UseTraderDetailsOptions) {
  const { address } = options;

  return useQuery<TraderDetails>({
    queryKey: ["traderDetails", address],
    queryFn: async () => {
      const response = await fetch(`/api/trader/details?address=${address}`);
      if (!response.ok) {
        throw new Error("Failed to fetch trader details");
      }
      return response.json();
    },
    enabled: !!address,
    refetchInterval: 60000, // Refetch every minute
  });
}


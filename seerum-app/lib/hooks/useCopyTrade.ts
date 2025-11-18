import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { Address } from "viem";

export interface CopySubscription {
  _id?: string;
  address: string; // Subscriber's address
  traderAddress: string; // Trader's address being copied
  percentage?: number; // Percentage of trade size to copy (1-100, default 100)
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Hook to subscribe to copy trades from a trader
 */
export function useSubscribeToTrader() {
  const { address } = useAccount();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ traderAddress, percentage }: { traderAddress: Address; percentage?: number }) => {
      if (!address) {
        throw new Error("Wallet not connected");
      }

      const response = await fetch("/api/copy-trade/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriberAddress: address,
          traderAddress,
          percentage: percentage !== undefined ? percentage : 100,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to subscribe");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate subscriptions query
      queryClient.invalidateQueries({ queryKey: ["copySubscriptions"] });
    },
  });
}

/**
 * Hook to unsubscribe from copying a trader
 */
export function useUnsubscribeFromTrader() {
  const { address } = useAccount();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (traderAddress: Address) => {
      if (!address) {
        throw new Error("Wallet not connected");
      }

      const response = await fetch("/api/copy-trade/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriberAddress: address,
          traderAddress,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to unsubscribe");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate subscriptions query
      queryClient.invalidateQueries({ queryKey: ["copySubscriptions"] });
    },
  });
}

/**
 * Hook to get user's copy trading subscriptions
 */
export function useCopySubscriptions() {
  const { address } = useAccount();

  return useQuery<{ subscriptions: CopySubscription[]; count: number }>({
    queryKey: ["copySubscriptions", address],
    queryFn: async () => {
      if (!address) {
        return { subscriptions: [], count: 0 };
      }

      const response = await fetch(
        `/api/copy-trade/subscribe?userAddress=${address}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch subscriptions");
      }

      return response.json();
    },
    enabled: !!address,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

/**
 * Hook to check if user is subscribed to a specific trader
 */
export function useIsSubscribedToTrader(traderAddress: Address | undefined) {
  const { data: subscriptions } = useCopySubscriptions();

  if (!traderAddress || !subscriptions) {
    return false;
  }

  return subscriptions.subscriptions.some(
    (sub) =>
      sub.traderAddress.toLowerCase() === traderAddress.toLowerCase() &&
      sub.active
  );
}

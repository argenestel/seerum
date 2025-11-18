import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { Address } from "viem";
import { useVault } from "./useVault";

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
 * Uses user's connected wallet address as subscriber (vault will be looked up when executing trades)
 */
export function useSubscribeToTrader() {
  const { address } = useAccount();
  const { data: vaultInfo } = useVault();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ traderAddress, percentage }: { traderAddress: Address; percentage?: number }) => {
      if (!address) {
        throw new Error("Wallet not connected");
      }

      if (!vaultInfo?.vaultAddress) {
        throw new Error("Vault wallet not found. Please create a vault wallet first.");
      }

      if (!traderAddress) {
        throw new Error("Trader address is required");
      }

      // Use user's connected wallet address as subscriber (vault will be looked up when executing trades)
      const requestBody = {
        subscriberAddress: address, // Use user's connected wallet address
        traderAddress,
        percentage: percentage !== undefined ? percentage : 100,
      };

      console.log("[useSubscribeToTrader] Subscribing:", {
        userAddress: address,
        vaultAddress: vaultInfo.vaultAddress,
        subscriberAddress: requestBody.subscriberAddress,
        traderAddress,
        percentage: requestBody.percentage,
      });

      const response = await fetch("/api/copy-trade/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
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
 * Uses user's connected wallet address as subscriber
 */
export function useUnsubscribeFromTrader() {
  const { address } = useAccount();
  const { data: vaultInfo } = useVault();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (traderAddress: Address) => {
      if (!address) {
        throw new Error("Wallet not connected");
      }

      if (!vaultInfo?.vaultAddress) {
        throw new Error("Vault wallet not found. Please create a vault wallet first.");
      }

      // Use user's connected wallet address as subscriber
      const response = await fetch("/api/copy-trade/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriberAddress: address, // Use user's connected wallet address
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
 * Fetches subscriptions for the user's connected wallet address
 */
export function useCopySubscriptions() {
  const { address } = useAccount();
  const { data: vaultInfo } = useVault();

  return useQuery<{ subscriptions: CopySubscription[]; count: number }>({
    queryKey: ["copySubscriptions", address],
    queryFn: async () => {
      if (!address) {
        return { subscriptions: [], count: 0 };
      }

      if (!vaultInfo?.vaultAddress) {
        // No vault yet, return empty subscriptions
        return { subscriptions: [], count: 0 };
      }

      // Fetch subscriptions for user's connected wallet address
      const response = await fetch(
        `/api/copy-trade/subscribe?userAddress=${address}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch subscriptions");
      }

      return response.json();
    },
    enabled: !!address && !!vaultInfo?.vaultAddress,
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
    (sub) => {
      // Handle both camelCase and snake_case formats
      const subTraderAddress = sub.traderAddress || (sub as any).trader_address;
      return (
        subTraderAddress &&
        subTraderAddress.toLowerCase() === traderAddress.toLowerCase() &&
      sub.active
      );
    }
  );
}

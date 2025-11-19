import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";

export interface SupportedAsset {
  chainId: string;
  chainName: string;
  token: {
    name: string;
    symbol: string;
    address: string;
    decimals: number;
  };
  minCheckoutUsd: number;
}

export interface DepositAddressesResponse {
  address: {
    evm: string;
    svm: string;
    btc: string;
  };
  note?: string;
}

const POLYMARKET_BRIDGE_API = "https://bridge.polymarket.com";

/**
 * Fetch supported assets from Polymarket bridge
 */
export function useSupportedAssets() {
  return useQuery<SupportedAsset[]>({
    queryKey: ["polymarketBridge", "supportedAssets"],
    queryFn: async () => {
      const response = await fetch(`${POLYMARKET_BRIDGE_API}/supported-assets`);
      if (!response.ok) {
        throw new Error("Failed to fetch supported assets");
      }
      const data = await response.json();
      return data.supportedAssets || [];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetch deposit addresses for a given wallet address
 */
export function useDepositAddresses(address?: string) {
  const { address: connectedAddress } = useAccount();
  const targetAddress = address || connectedAddress;

  return useQuery<DepositAddressesResponse>({
    queryKey: ["polymarketBridge", "depositAddresses", targetAddress],
    queryFn: async () => {
      if (!targetAddress) {
        throw new Error("Address is required");
      }

      const response = await fetch(`${POLYMARKET_BRIDGE_API}/deposit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address: targetAddress,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch deposit addresses");
      }

      return response.json();
    },
    enabled: !!targetAddress,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
  });
}


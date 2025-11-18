import { useQuery, useMutation } from "@tanstack/react-query";
import { useAccount } from "wagmi";

export interface VaultInfo {
  id: string;
  userAddress: string;
  vaultAddress: string;
  safeAddress?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SafeInfo {
  vaultAddress: string;
  safeAddress: string;
  isDeployed: boolean;
}

export interface PolymarketInfo {
  safeAddress: string;
  onChainBalance: string;
  polymarketBalance: string | null;
  depositAddress: string;
}

/**
 * Hook to create a vault for the current user
 */
export function useCreateVault() {
  const { address } = useAccount();

  return useMutation({
    mutationFn: async () => {
      if (!address) {
        throw new Error("Wallet not connected");
      }

      const response = await fetch("/api/vault/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAddress: address }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create vault");
      }

      return response.json();
    },
  });
}

/**
 * Hook to get vault info for the current user (does NOT auto-create)
 */
export function useVault() {
  const { address } = useAccount();

  return useQuery<VaultInfo | null>({
    queryKey: ["vault", address],
    queryFn: async () => {
      if (!address) {
        return null;
      }

      // Get vault by user address (does not create if not exists)
      const response = await fetch(`/api/vault/get?userAddress=${address}`);

      if (response.status === 404) {
        // Vault doesn't exist - return null (don't auto-create)
        return null;
      }

      if (!response.ok) {
        throw new Error("Failed to get vault");
      }

      const vaultData = await response.json();
      return {
        id: vaultData.id,
        vaultAddress: vaultData.vaultAddress,
        userAddress: address,
        createdAt: vaultData.createdAt,
        updatedAt: vaultData.updatedAt,
      };
    },
    enabled: !!address,
    retry: false, // Don't retry on 404 (vault doesn't exist)
  });
}

/**
 * Hook to get Safe address for a vault
 */
export function useSafeAddress(vaultAddress?: string) {
  const { address } = useAccount();

  return useQuery<SafeInfo>({
    queryKey: ["safeAddress", vaultAddress, address],
    queryFn: async () => {
      if (!vaultAddress && !address) {
        throw new Error("vaultAddress or user address required");
      }

      const params = new URLSearchParams();
      if (vaultAddress) {
        // If vaultAddress provided, we need vaultId or userAddress
        // For now, use userAddress if available
        if (address) {
          params.append("userAddress", address);
        }
      } else if (address) {
        params.append("userAddress", address);
      }

      const response = await fetch(`/api/vault/safe-address?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to get Safe address");
      }

      return response.json();
    },
    enabled: !!address,
  });
}

/**
 * Hook to deploy Safe wallet from vault
 */
export function useDeploySafeFromVault() {
  const { address } = useAccount();

  return useMutation({
    mutationFn: async (vaultId?: string) => {
      if (!address) {
        throw new Error("Wallet not connected");
      }

      const response = await fetch("/api/vault/deploy-safe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAddress: address, vaultId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to deploy Safe");
      }

      return response.json();
    },
  });
}

/**
 * Hook to get Polymarket info for a Safe address
 */
export function usePolymarketInfo(safeAddress?: string, vaultPrivateKey?: string) {
  return useQuery<PolymarketInfo>({
    queryKey: ["polymarketInfo", safeAddress],
    queryFn: async () => {
      if (!safeAddress) {
        throw new Error("safeAddress is required");
      }

      const params = new URLSearchParams({ safeAddress });
      if (vaultPrivateKey) {
        params.append("vaultPrivateKey", vaultPrivateKey);
      }

      const response = await fetch(`/api/polymarket/info?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to get Polymarket info");
      }

      return response.json();
    },
    enabled: !!safeAddress,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

/**
 * Hook to get vault private key for MetaMask import
 */
export function useGetVaultPrivateKey() {
  const { address } = useAccount();

  return useMutation({
    mutationFn: async (vaultId: string) => {
      if (!address) {
        throw new Error("Wallet not connected");
      }

      const response = await fetch("/api/vault/decrypt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userAddress: address,
          vaultId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get vault private key");
      }

      return response.json();
    },
  });
}

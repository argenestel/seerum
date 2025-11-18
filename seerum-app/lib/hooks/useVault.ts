import { useMutation, useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";

export interface VaultInfo {
  id: string;
  userAddress: string;
  vaultAddress: string;
  privateKey: string; // Now stored unencrypted
  createdAt: string;
  updatedAt: string;
}

/**
 * Hook to create a vault wallet (no signature required)
 */
export function useCreateVault() {
  const { address } = useAccount();

  return useMutation({
    mutationFn: async () => {
      if (!address) {
        throw new Error("Wallet not connected");
      }

      // No signature needed - just create vault
      const response = await fetch("/api/vault/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userAddress: address,
        }),
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
 * Hook to get vault info
 */
export function useVaultInfo() {
  const { address } = useAccount();

  return useQuery<{ vault: VaultInfo | null }>({
    queryKey: ["vaultInfo", address],
    queryFn: async () => {
      if (!address) {
        return { vault: null };
      }

      const response = await fetch(`/api/vault/list?userAddress=${address}`);
      if (!response.ok) {
        throw new Error("Failed to fetch vault");
      }

      return response.json();
    },
    enabled: !!address,
    refetchInterval: 30000,
  });
}

/**
 * Hook to get vault private key (no signature required - unencrypted)
 */
export function useDecryptVault() {
  const { address } = useAccount();

  return useMutation({
    mutationFn: async (vaultId: string) => {
      if (!address) {
        throw new Error("Wallet not connected");
      }

      // No signature needed - just verify ownership
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
        throw new Error(error.error || "Failed to get vault");
      }

      return response.json();
    },
  });
}


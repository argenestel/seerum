import { useQuery, useMutation } from "@tanstack/react-query";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { Address } from "viem";

interface SafeWalletStatus {
  exists: boolean;
  address: Address;
  isSafe?: boolean;
}

export function useSafeWalletStatus() {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  return useQuery<SafeWalletStatus>({
    queryKey: ["safeWalletStatus", address],
    queryFn: async () => {
      if (!address || !publicClient) {
        throw new Error("Wallet not connected");
      }

      // Check if Safe exists for this address
      const response = await fetch(`/api/safe/check?address=${address}`);
      if (!response.ok) {
        throw new Error("Failed to check Safe wallet");
      }
      return response.json();
    },
    enabled: !!address && !!publicClient,
    refetchInterval: 30000,
  });
}

// Re-export client-side deployment hook
export { useDeploySafeClient as useDeploySafe } from "./useDeploySafeClient";

export function useDepositUSDC() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  return useMutation({
    mutationFn: async ({ safeAddress, amount }: { safeAddress: Address; amount: string }) => {
      if (!address || !walletClient || !publicClient) {
        throw new Error("Wallet not connected");
      }

      // Parse USDC amount (6 decimals)
      const amountBigInt = BigInt(Math.floor(parseFloat(amount) * 1e6));

      // Transfer USDC from user's wallet to Safe wallet
      // This is a regular ERC20 transfer, not a Safe transaction
      const hash = await walletClient.writeContract({
        address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174" as Address, // USDC
        abi: [
          {
            inputs: [
              { name: "to", type: "address" },
              { name: "amount", type: "uint256" },
            ],
            name: "transfer",
            outputs: [{ name: "", type: "bool" }],
            stateMutability: "nonpayable",
            type: "function",
          },
        ],
        functionName: "transfer",
        args: [safeAddress, amountBigInt],
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      return { hash, receipt };
    },
  });
}


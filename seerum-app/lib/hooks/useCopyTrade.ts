import { useMutation } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { createPolymarketClient, executeCopyTrade, CopyTradeParams } from "@/lib/utils/polymarket";
import { Side } from "@polymarket/clob-client";

interface UseCopyTradeOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useCopyTrade(options: UseCopyTradeOptions = {}) {
  const { address, connector } = useAccount();
  const { onSuccess, onError } = options;

  return useMutation({
    mutationFn: async (params: CopyTradeParams) => {
      if (!address || !connector) {
        throw new Error("Wallet not connected");
      }

      // Get the private key from the wallet
      // Note: This requires the user to sign a message or use a wallet adapter
      // For production, you'll need to implement proper wallet integration
      const provider = await connector.getProvider();
      
      // Create Polymarket client
      // Note: You'll need to get the private key securely from the user's wallet
      // This is a placeholder - implement proper wallet integration
      const privateKey = ""; // Get from wallet securely
      const proxyAddress = ""; // Get user's Polymarket proxy address

      if (!privateKey) {
        throw new Error("Private key not available");
      }

      const client = await createPolymarketClient({
        privateKey,
        proxyAddress,
      });

      return executeCopyTrade(client, params);
    },
    onSuccess,
    onError,
  });
}

// Helper hook to copy a specific trade
export function useCopyTraderTrade() {
  const copyTrade = useCopyTrade({
    onSuccess: () => {
      console.log("Trade copied successfully");
    },
    onError: (error) => {
      console.error("Failed to copy trade:", error);
    },
  });

  const copyTradeFromTrader = async (
    tokenId: string,
    side: "BUY" | "SELL",
    size: number,
    price: number
  ) => {
    return copyTrade.mutateAsync({
      tokenId,
      side: side === "BUY" ? Side.BUY : Side.SELL,
      size,
      price,
    });
  };

  return {
    copyTrade: copyTradeFromTrader,
    isLoading: copyTrade.isPending,
    error: copyTrade.error,
  };
}


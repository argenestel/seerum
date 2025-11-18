import { useMutation } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { Address } from "viem";
import { createClobClientFromVault } from "@/lib/utils/vault-trading";
import { Side, OrderType } from "@polymarket/clob-client";

/**
 * Client-side trading using vault wallet from Supabase
 * Uses private keys stored in Supabase vaults
 */
export function useTradeClient() {
  const { address } = useAccount();

  return useMutation({
    mutationFn: async ({
      tokenId,
      side,
      size,
      price,
      safeAddress,
      vaultPrivateKey,
    }: {
      tokenId: string;
      side: "BUY" | "SELL";
      size: string;
      price: string;
      safeAddress?: Address;
      vaultPrivateKey: string; // Private key from vault
    }) => {
      if (!address) {
        throw new Error("Wallet not connected");
      }

      if (!vaultPrivateKey) {
        throw new Error("Vault private key is required");
      }

      // Create CLOB client from vault private key
      const clobClient = await createClobClientFromVault(
        vaultPrivateKey,
        safeAddress
      );

      // Create order
      const order = await clobClient.createOrder({
        price: parseFloat(price),
        side: side === "BUY" ? Side.BUY : Side.SELL,
        size: parseFloat(size),
        tokenID: tokenId,
      });

      // Post order (uses relayer if configured)
      const response = await clobClient.postOrder(order, OrderType.GTC);

      return {
        success: true,
        orderId: response.order_id || response.id,
        order,
      };
    },
  });
}


import { useMutation } from "@tanstack/react-query";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { ClobClient, Side } from "@polymarket/clob-client";
import { SignatureType } from "@polymarket/order-utils";
import { BuilderConfig } from "@polymarket/builder-signing-sdk";
import { Address } from "viem";
import { ClobWalletAdapter } from "@/lib/utils/clob-wallet-adapter";

const CLOB_HOST = "https://clob.polymarket.com";
const CHAIN_ID = 137; // Polygon mainnet
const BUILDER_SIGNING_SERVER_URL =
  process.env.NEXT_PUBLIC_BUILDER_SIGNING_SERVER_URL || "http://localhost:3001";

/**
 * Client-side trading using wallet signing
 * Production-ready: No private key required
 */
export function useTradeClient() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  return useMutation({
    mutationFn: async ({
      tokenId,
      side,
      size,
      price,
      safeAddress,
    }: {
      tokenId: string;
      side: "BUY" | "SELL";
      size: string;
      price: string;
      safeAddress?: Address;
    }) => {
      if (!address || !walletClient || !publicClient) {
        throw new Error("Wallet not connected");
      }

      // Create wallet adapter that bridges viem WalletClient to ethers Signer
      const walletAdapter = new ClobWalletAdapter(walletClient, publicClient);

      // Configure builder signing server
      const builderConfig = new BuilderConfig({
        remoteBuilderConfig: {
          url: `${BUILDER_SIGNING_SERVER_URL}/sign`,
        },
      });

      // Create CLOB client
      const clobClient = new ClobClient(
        CLOB_HOST,
        CHAIN_ID,
        walletAdapter as any, // Type assertion for ethers Signer compatibility
        undefined, // API creds will be created
        safeAddress ? SignatureType.POLY_PROXY : SignatureType.EIP712,
        safeAddress, // Proxy address (Safe)
        undefined,
        false,
        builderConfig
      );

      // Create or derive API credentials
      const apiCreds = await clobClient.create_or_derive_api_creds();
      clobClient.set_api_creds(apiCreds);

      // Create order
      const order = await clobClient.createOrder({
        price: parseFloat(price),
        side: side === "BUY" ? Side.BUY : Side.SELL,
        size: parseFloat(size),
        tokenID: tokenId,
        orderType: "GTC",
      });

      // Post order (uses relayer if configured)
      const response = await clobClient.postOrder(order);

      return {
        success: true,
        orderId: response.order_id || response.id,
        order,
      };
    },
  });
}


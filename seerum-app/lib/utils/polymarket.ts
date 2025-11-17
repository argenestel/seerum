import { ClobClient } from "@polymarket/clob-client";
import { BuilderConfig } from "@polymarket/builder-signing-sdk";
import { ethers } from "ethers";
import { Side, SignatureType, OrderType } from "@polymarket/clob-client";

const CLOB_HOST = "https://clob.polymarket.com";
const CHAIN_ID = 137; // Polygon mainnet
const BUILDER_SIGNING_SERVER_URL =
  process.env.NEXT_PUBLIC_BUILDER_SIGNING_SERVER_URL || "http://localhost:3001";

export interface PolymarketClientConfig {
  privateKey: string;
  proxyAddress?: string;
  signatureType?: SignatureType;
}

export async function createPolymarketClient(config: PolymarketClientConfig) {
  const { privateKey, proxyAddress, signatureType = SignatureType.POLY_PROXY } = config;

  // Create wallet from private key
  const wallet = new ethers.Wallet(privateKey);

  // Create provider (you should use your own RPC endpoint)
  const provider = new ethers.JsonRpcProvider(
    process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon-rpc.com"
  );

  const connectedWallet = wallet.connect(provider);

  // Configure builder signing (remote)
  const builderConfig = new BuilderConfig({
    remoteBuilderConfig: {
      url: `${BUILDER_SIGNING_SERVER_URL}/sign`,
      // Optional: Add authorization token if your server requires it
      // token: process.env.NEXT_PUBLIC_BUILDER_AUTH_TOKEN,
    },
  });

  // Create CLOB client
  const client = new ClobClient(
    CLOB_HOST,
    CHAIN_ID,
    connectedWallet,
    undefined, // API creds will be created/derived
    signatureType,
    proxyAddress,
    undefined,
    false,
    builderConfig
  );

  // Create or derive API credentials
  const apiCreds = await client.create_or_derive_api_creds();
  client.set_api_creds(apiCreds);

  return client;
}

export interface CopyTradeParams {
  tokenId: string;
  side: Side;
  size: number;
  price: number;
}

export async function executeCopyTrade(
  client: ClobClient,
  params: CopyTradeParams
) {
  const { tokenId, side, size, price } = params;

  try {
    // Create order
    const order = await client.createOrder({
      tokenID: tokenId,
      side,
      size,
      price,
    });

    // Post order as GTC (Good-Till-Cancelled)
    const response = await client.postOrder(order, OrderType.GTC);

    return response;
  } catch (error) {
    console.error("Copy trade error:", error);
    throw error;
  }
}

// Helper to get token IDs from market condition ID
export async function getMarketTokenIds(conditionId: string) {
  // This would typically fetch from Gamma API or CLOB API
  // For now, returning a placeholder structure
  // You'll need to implement this based on your market data source
  return {
    yesTokenId: "", // Fetch from market data
    noTokenId: "", // Fetch from market data
  };
}


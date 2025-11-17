import { RelayClient } from "@polymarket/builder-relayer-client";
import { BuilderConfig } from "@polymarket/builder-signing-sdk";
import { Wallet } from "@ethersproject/wallet";
import { Address } from "viem";

const RELAYER_URL = "https://relayer-v2.polymarket.com/";
const CHAIN_ID = 137; // Polygon mainnet
const BUILDER_SIGNING_SERVER_URL =
  process.env.NEXT_PUBLIC_BUILDER_SIGNING_SERVER_URL || "http://localhost:3001";

/**
 * Create a RelayClient instance for gasless transactions
 * Uses remote builder signing server for authentication
 */
export function createRelayClient(privateKey: string): RelayClient {
  // Create ethers wallet from private key
  const wallet = new Wallet(privateKey);

  // Configure builder signing (remote)
  const builderConfig = new BuilderConfig({
    remoteBuilderConfig: {
      url: `${BUILDER_SIGNING_SERVER_URL}/sign`,
      // Optional: Add authorization token if your server requires it
      // token: process.env.NEXT_PUBLIC_BUILDER_AUTH_TOKEN,
    },
  });

  // Create RelayClient
  const client = new RelayClient(RELAYER_URL, CHAIN_ID, wallet, builderConfig);

  return client;
}

/**
 * Get user's Safe wallet address (proxy address)
 * This is the address that will be used for Polymarket trading
 */
export async function getSafeAddress(
  client: RelayClient,
  userAddress: Address
): Promise<Address | null> {
  try {
    // The RelayClient can deploy Safe if it doesn't exist
    // For now, we'll check if it exists by trying to get the proxy address
    // In production, you might want to query the factory or store this value
    
    // Note: After deploying Safe, the proxyAddress is returned in the result
    // For checking, you might need to query the Safe factory
    return null; // Will be set after deployment
  } catch {
    return null;
  }
}


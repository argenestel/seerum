import { RelayClient } from "@polymarket/builder-relayer-client";
import { BuilderConfig } from "@polymarket/builder-signing-sdk";
import { privateKeyToAccount } from "viem/accounts";
import { createWalletClient, http, Hex } from "viem";
import { polygon } from "viem/chains";

const RELAYER_URL = "https://relayer-v2.polymarket.com/";
const CHAIN_ID = 137; // Polygon mainnet
const BUILDER_SIGNING_SERVER_URL =
  process.env.NEXT_PUBLIC_BUILDER_SIGNING_SERVER_URL || "http://localhost:3001";
const RPC_URL = process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon-rpc.com";

/**
 * Deploy Safe wallet from vault wallet private key using RelayClient (gasless)
 * Uses viem wallet client like the relayer examples
 */
export async function deploySafeFromVault(
  vaultPrivateKey: string
): Promise<{ safeAddress: string; transactionHash: string }> {
  console.log("🚀 Deploying Safe wallet via relayer (gasless)...");
  
  // Create viem wallet client (matching relayer examples)
  const pk = privateKeyToAccount(`0x${vaultPrivateKey}` as Hex);
  const wallet = createWalletClient({
    account: pk,
    chain: polygon,
    transport: http(RPC_URL)
  });

  console.log(`   Wallet Address: ${wallet.account.address}`);

  // Configure builder signing server (remote)
  const builderConfig = new BuilderConfig({
    remoteBuilderConfig: {
      url: `${BUILDER_SIGNING_SERVER_URL}/sign`,
    },
  });

  // Create RelayClient for gasless deployment
  // RelayClient accepts viem WalletClient directly (type assertion needed due to viem version differences)
  const client = new RelayClient(RELAYER_URL, CHAIN_ID, wallet as any, builderConfig);

  // Deploy Safe wallet (gasless via relayer)
  console.log("   Submitting deployment to relayer...");
  const response = await client.deploy();
  
  console.log("   Waiting for relayer to process...");
  const result = await response.wait();

  if (!result || !result.proxyAddress) {
    throw new Error("Safe deployment failed - no proxy address returned");
  }

  console.log(`✅ Safe wallet deployed successfully via relayer!`);
  console.log(`   Safe Address: ${result.proxyAddress}`);
  console.log(`   Transaction Hash: ${result.transactionHash}`);
  console.log(`   State: ${result.state}`);

  return {
    safeAddress: result.proxyAddress,
    transactionHash: result.transactionHash,
  };
}

/**
 * Get Safe address for a vault wallet (without deploying)
 * Computes the Safe address deterministically from the vault address
 */
export async function getSafeAddressForVault(vaultAddress: string): Promise<string> {
  const { createPublicClient, http } = await import("viem");
  const { polygon } = await import("viem/chains");
  const { SAFE_FACTORY_ADDRESS, SAFE_FACTORY_ABI } = await import("./safe-wallet");

  const publicClient = createPublicClient({
    chain: polygon,
    transport: http(process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon-rpc.com"),
  });

  const safeAddress = await publicClient.readContract({
    address: SAFE_FACTORY_ADDRESS,
    abi: SAFE_FACTORY_ABI,
    functionName: "computeProxyAddress",
    args: [vaultAddress as `0x${string}`],
  });

  return safeAddress;
}


import { RelayClient } from "@polymarket/builder-relayer-client";
import { BuilderConfig } from "@polymarket/builder-signing-sdk";
import { privateKeyToAccount } from "viem/accounts";
import { createWalletClient, http, Hex } from "viem";
import { polygon } from "viem/chains";

const RELAYER_URL = "https://relayer-v2.polymarket.com/";
const CHAIN_ID = 137; // Polygon mainnet
const BUILDER_SIGNING_SERVER_URL =
  process.env.NEXT_PUBLIC_BUILDER_SIGNING_SERVER_URL || 
  process.env.BUILDER_SIGNING_SERVER_URL || 
  "http://localhost:3001";
const BUILDER_AUTH_TOKEN = 
  process.env.NEXT_PUBLIC_BUILDER_AUTH_TOKEN || 
  process.env.BUILDER_AUTH_TOKEN;
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
  console.log(`   Builder Signing Server URL: ${BUILDER_SIGNING_SERVER_URL}`);
  console.log(`   Auth Token Set: ${BUILDER_AUTH_TOKEN ? 'YES' : 'NO'}`);
  if (BUILDER_AUTH_TOKEN) {
    console.log(`   Using authorization token: ${BUILDER_AUTH_TOKEN.substring(0, 10)}...`);
  } else {
    console.log(`   ⚠️  No auth token set - server should allow requests without auth`);
  }

  // Configure builder signing server (remote)
  const remoteConfig: { url: string; token?: string } = {
    url: `${BUILDER_SIGNING_SERVER_URL}/sign`,
  };
  
  // Only add token if it's actually set (not empty string)
  if (BUILDER_AUTH_TOKEN && BUILDER_AUTH_TOKEN.trim().length > 0) {
    remoteConfig.token = BUILDER_AUTH_TOKEN;
  }
  
  const builderConfig = new BuilderConfig({
    remoteBuilderConfig: remoteConfig,
  });
  
  console.log(`   Builder Config URL: ${remoteConfig.url}`);
  console.log(`   Builder Config has token: ${!!remoteConfig.token}`);

  // Create RelayClient for gasless deployment
  // RelayClient accepts viem WalletClient directly (type assertion needed due to viem version differences)
  const client = new RelayClient(RELAYER_URL, CHAIN_ID, wallet as any, builderConfig);

  // Deploy Safe wallet (gasless via relayer)
  console.log("   Submitting deployment to relayer...");
  let response;
  try {
    response = await client.deploy();
  } catch (error) {
    console.error("   ❌ Failed to deploy Safe wallet:", error);
    console.error("   Error details:", {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'Unknown',
      cause: error instanceof Error && 'cause' in error ? error.cause : undefined,
    });
    
    if (error instanceof Error) {
      if (error.message.includes("ECONNREFUSED") || error.message.includes("fetch failed")) {
        throw new Error(`Cannot connect to builder signing server at ${BUILDER_SIGNING_SERVER_URL}. Please check NEXT_PUBLIC_BUILDER_SIGNING_SERVER_URL environment variable. Current value: ${BUILDER_SIGNING_SERVER_URL}`);
      }
      if (error.message.includes("401") || error.message.includes("Unauthorized")) {
        const errorMsg = BUILDER_AUTH_TOKEN 
          ? `Builder signing server returned 401 Unauthorized. The token might be incorrect, or your server might not require auth (check if AUTHORIZATION_TOKEN is set in your builder server).`
          : `Builder signing server returned 401 Unauthorized. Your server might have AUTHORIZATION_TOKEN set. Either remove it from your builder server, or set NEXT_PUBLIC_BUILDER_AUTH_TOKEN in your Next.js app to match.`;
        throw new Error(errorMsg);
      }
    }
    throw error;
  }
  
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


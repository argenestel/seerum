import { ethers } from "ethers";
import { RelayClient } from "@polymarket/builder-relayer-client";
import { BuilderConfig } from "@polymarket/builder-signing-sdk";
import { Wallet } from "@ethersproject/wallet";

const RELAYER_URL = "https://relayer-v2.polymarket.com/";
const CHAIN_ID = 137; // Polygon mainnet
const BUILDER_SIGNING_SERVER_URL =
  process.env.NEXT_PUBLIC_BUILDER_SIGNING_SERVER_URL || "http://localhost:3001";

/**
 * Deploy Safe wallet from vault wallet private key
 */
export async function deploySafeFromVault(
  vaultPrivateKey: string,
  relayerWalletPrivateKey?: string
): Promise<{ safeAddress: string; transactionHash: string }> {
  // Create vault wallet
  const vaultWallet = new Wallet(vaultPrivateKey);

  // Configure builder signing server
  const builderConfig = new BuilderConfig({
    remoteBuilderConfig: {
      url: `${BUILDER_SIGNING_SERVER_URL}/sign`,
    },
  });

  // Use relayer wallet if provided, otherwise use vault wallet
  const walletForRelayer = relayerWalletPrivateKey
    ? new Wallet(relayerWalletPrivateKey)
    : vaultWallet;

  // Create RelayClient
  const client = new RelayClient(RELAYER_URL, CHAIN_ID, walletForRelayer, builderConfig);

  // Deploy Safe wallet (gasless via relayer)
  const response = await client.deploy();
  const result = await response.wait();

  if (!result || !result.proxyAddress) {
    throw new Error("Safe deployment failed");
  }

  return {
    safeAddress: result.proxyAddress,
    transactionHash: result.transactionHash,
  };
}

/**
 * Get Safe address for a vault wallet (without deploying)
 */
export async function getSafeAddressForVault(vaultPrivateKey: string): Promise<string> {
  const vaultWallet = new Wallet(vaultPrivateKey);
  return vaultWallet.address; // Safe address is same as vault address for Polymarket
}


import { ClobClient } from "@polymarket/clob-client";
import { BuilderConfig } from "@polymarket/builder-signing-sdk";
import { ethers } from "ethers";
import { Side, OrderType } from "@polymarket/clob-client";
import { SignatureType } from "@polymarket/order-utils";
import { Wallet } from "@ethersproject/wallet";

const CLOB_HOST = "https://clob.polymarket.com";
const CHAIN_ID = 137; // Polygon mainnet
const BUILDER_SIGNING_SERVER_URL =
  process.env.NEXT_PUBLIC_BUILDER_SIGNING_SERVER_URL || "http://localhost:3001";

/**
 * Create CLOB client from vault wallet private key
 */
export async function createClobClientFromVault(
  vaultPrivateKey: string,
  safeAddress?: string
): Promise<ClobClient> {
  // Create wallet from private key
  const wallet = new Wallet(vaultPrivateKey);

  // Create provider
  const provider = new ethers.JsonRpcProvider(
    process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon-rpc.com"
  );

  const connectedWallet = wallet.connect(provider);

  // Configure builder signing
  const builderConfig = new BuilderConfig({
    remoteBuilderConfig: {
      url: `${BUILDER_SIGNING_SERVER_URL}/sign`,
    },
  });

  // Create CLOB client
  const client = new ClobClient(
    CLOB_HOST,
    CHAIN_ID,
    connectedWallet,
    undefined, // API creds will be created/derived
    SignatureType.POLY_PROXY,
    safeAddress, // Use Safe address if provided
    undefined,
    false,
    builderConfig
  );

  // Create or derive API credentials
  const apiCreds = await client.create_or_derive_api_creds();
  client.set_api_creds(apiCreds);

  return client;
}

/**
 * Buy shares using vault wallet
 */
export async function buySharesWithVault(
  vaultPrivateKey: string,
  tokenId: string,
  size: number,
  price: number,
  safeAddress?: string
): Promise<any> {
  const client = await createClobClientFromVault(vaultPrivateKey, safeAddress);

  // Create buy order
  const order = await client.createOrder({
    tokenID: tokenId,
    side: Side.BUY,
    size,
    price,
  });

  // Post order
  const response = await client.postOrder(order, OrderType.GTC);

  return response;
}

/**
 * Sell shares using vault wallet
 */
export async function sellSharesWithVault(
  vaultPrivateKey: string,
  tokenId: string,
  size: number,
  price: number,
  safeAddress?: string
): Promise<any> {
  const client = await createClobClientFromVault(vaultPrivateKey, safeAddress);

  // Create sell order
  const order = await client.createOrder({
    tokenID: tokenId,
    side: Side.SELL,
    size,
    price,
  });

  // Post order
  const response = await client.postOrder(order, OrderType.GTC);

  return response;
}


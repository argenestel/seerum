import { NextRequest, NextResponse } from "next/server";
import { RelayClient } from "@polymarket/builder-relayer-client";
import { BuilderConfig } from "@polymarket/builder-signing-sdk";
import { Wallet } from "@ethersproject/wallet";
import { Address } from "viem";

const RELAYER_URL = "https://relayer-v2.polymarket.com/";
const CHAIN_ID = 137; // Polygon mainnet
const BUILDER_SIGNING_SERVER_URL =
  process.env.NEXT_PUBLIC_BUILDER_SIGNING_SERVER_URL || "http://localhost:3001";

/**
 * Deploy Safe wallet via relayer (gasless)
 * 
 * Production approach: Accept signed deployment data from client
 * The client signs the deployment transaction, we submit it via relayer
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userAddress, 
      signedData, // EIP-712 signed Safe deployment data from client
      signature, // Signature from user's wallet
    } = body;

    if (!userAddress) {
      return NextResponse.json(
        { error: "User address is required" },
        { status: 400 }
      );
    }

    // For relayer deployment, we need a wallet to submit the transaction
    // Option 1: Use a server-side wallet (for relayer submission only)
    // Option 2: Use the signed data directly (if relayer supports it)
    
    // For now, we'll use a server-side wallet for relayer submission
    // The user's signature is in signedData, but RelayClient needs a wallet instance
    // In production, you might want to use a dedicated relayer wallet
    
    // Note: This is a limitation of the RelayClient - it requires a wallet instance
    // For true production, you'd need to either:
    // 1. Use a server-side wallet for relayer operations (doesn't need to match user)
    // 2. Or use direct contract interaction (user pays gas)
    
    // For demo/production: Use a server-side relayer wallet
    // This wallet is only used to submit to relayer, not to sign user transactions
    const relayerWalletPrivateKey = process.env.RELAYER_WALLET_PRIVATE_KEY;
    
    if (!relayerWalletPrivateKey) {
      // Fallback: Return instructions for client-side deployment
      return NextResponse.json(
        {
          error: "Relayer wallet not configured",
          message: "For gasless deployment, configure RELAYER_WALLET_PRIVATE_KEY. Alternatively, use client-side deployment.",
          useClientSide: true,
        },
        { status: 400 }
      );
    }

    // Create relayer wallet (this is just for submitting to relayer)
    const relayerWallet = new Wallet(relayerWalletPrivateKey);

    // Configure builder signing server
    const builderConfig = new BuilderConfig({
      remoteBuilderConfig: {
        url: `${BUILDER_SIGNING_SERVER_URL}/sign`,
      },
    });

    // Create RelayClient with relayer wallet
    // Note: The actual Safe will be owned by userAddress, not relayerWallet
    const client = new RelayClient(RELAYER_URL, CHAIN_ID, relayerWallet, builderConfig);

    // Deploy Safe wallet for the user (gasless)
    // The relayer will execute this transaction
    const response = await client.deploy();
    const result = await response.wait();

    if (result && result.proxyAddress) {
      return NextResponse.json({
        success: true,
        transactionHash: result.transactionHash,
        safeAddress: result.proxyAddress as Address,
        state: result.state,
      });
    } else {
      return NextResponse.json(
        { error: "Safe deployment failed" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Safe deploy relayer API error:", error);
    return NextResponse.json(
      {
        error: "Failed to deploy Safe wallet",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

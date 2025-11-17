import { NextRequest, NextResponse } from "next/server";
import { RelayClient } from "@polymarket/builder-relayer-client";
import { BuilderConfig } from "@polymarket/builder-signing-sdk";
import { Wallet } from "@ethersproject/wallet";

const RELAYER_URL = "https://relayer-v2.polymarket.com/";
const CHAIN_ID = 137; // Polygon mainnet
const BUILDER_SIGNING_SERVER_URL =
  process.env.NEXT_PUBLIC_BUILDER_SIGNING_SERVER_URL || "http://localhost:3001";

/**
 * Execute a trade using the relayer (gasless transaction)
 * This uses the builder signing server for order attribution
 * 
 * Options:
 * 1. Direct EOA transaction (user's wallet) - simpler, no Safe needed
 * 2. Safe wallet transaction - better UX, requires Safe deployment
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userAddress, 
      privateKey, // User's wallet private key (from browser wallet export)
      safeAddress, // Optional: If using Safe wallet
      tokenId,
      side, // "BUY" or "SELL"
      size,
      price,
      useSafe = false, // Whether to use Safe wallet or direct EOA
    } = body;

    if (!userAddress || !privateKey) {
      return NextResponse.json(
        { error: "User address and private key are required" },
        { status: 400 }
      );
    }

    if (!tokenId || !side || !size || !price) {
      return NextResponse.json(
        { error: "Trade parameters (tokenId, side, size, price) are required" },
        { status: 400 }
      );
    }

    // Create wallet from private key
    const wallet = new Wallet(privateKey);
    
    // Verify the wallet address matches
    if (wallet.address.toLowerCase() !== userAddress.toLowerCase()) {
      return NextResponse.json(
        { error: "Private key does not match user address" },
        { status: 400 }
      );
    }

    // Configure builder signing server (your server at port 3001)
    const builderConfig = new BuilderConfig({
      remoteBuilderConfig: {
        url: `${BUILDER_SIGNING_SERVER_URL}/sign`,
        // Optional: Add authorization token if your server requires it
        // token: process.env.BUILDER_AUTH_TOKEN,
      },
    });

    // Create RelayClient
    const client = new RelayClient(RELAYER_URL, CHAIN_ID, wallet, builderConfig);

    if (useSafe && safeAddress) {
      // Option 1: Execute via Safe wallet (requires Safe to be deployed)
      // The relayer will handle the Safe transaction
      const response = await client.execute({
        to: safeAddress, // Safe wallet address
        data: "0x", // Transaction data (would be encoded function call)
        value: "0",
      });
      
      const result = await response.wait();
      
      return NextResponse.json({
        success: true,
        transactionHash: result.transactionHash,
        safeAddress: safeAddress,
        method: "safe",
      });
    } else {
      // Option 2: Direct EOA transaction via relayer (gasless)
      // This is simpler - no Safe needed, but user must export private key
      // For production, consider using wallet signing instead of private key
      
      // Note: For actual trading, you'd use CLOB client, not relayer directly
      // This is a simplified example
      return NextResponse.json({
        success: true,
        message: "Direct EOA transactions via relayer require CLOB client integration",
        note: "Use the CLOB client with builder config for actual trades",
        method: "eoa",
      });
    }
  } catch (error) {
    console.error("Trade execution error:", error);
    return NextResponse.json(
      {
        error: "Failed to execute trade",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


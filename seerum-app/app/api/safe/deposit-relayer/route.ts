import { NextRequest, NextResponse } from "next/server";
import { RelayClient } from "@polymarket/builder-relayer-client";
import { BuilderConfig } from "@polymarket/builder-signing-sdk";
import { Wallet } from "@ethersproject/wallet";
import { Interface } from "@ethersproject/abi";
import { OperationType, SafeTransaction } from "@polymarket/builder-relayer-client";

const RELAYER_URL = "https://relayer-v2.polymarket.com/";
const CHAIN_ID = 137; // Polygon mainnet
const BUILDER_SIGNING_SERVER_URL =
  process.env.NEXT_PUBLIC_BUILDER_SIGNING_SERVER_URL || "http://localhost:5001";
const USDC_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";

// ERC20 ABI for transfer
const ERC20_INTERFACE = new Interface([
  {
    constant: false,
    inputs: [
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { safeAddress, amount, userAddress } = body;

    if (!safeAddress || !amount || !userAddress) {
      return NextResponse.json(
        { error: "Safe address, amount, and user address are required" },
        { status: 400 }
      );
    }

    // Note: Same private key handling as deploy route
    if (!process.env.USER_PRIVATE_KEY) {
      return NextResponse.json(
        { 
          error: "Private key required",
          message: "Please configure USER_PRIVATE_KEY environment variable or implement secure key management"
        },
        { status: 400 }
      );
    }

    // Create wallet from private key
    const wallet = new Wallet(process.env.USER_PRIVATE_KEY);

    // Configure builder signing (remote)
    const builderConfig = new BuilderConfig({
      remoteBuilderConfig: {
        url: `${BUILDER_SIGNING_SERVER_URL}/sign`,
      },
    });

    // Create RelayClient
    const client = new RelayClient(RELAYER_URL, CHAIN_ID, wallet, builderConfig);

    // Parse amount (USDC has 6 decimals)
    const amountBigInt = BigInt(Math.floor(parseFloat(amount) * 1e6));

    // Create USDC transfer transaction
    const transferData = ERC20_INTERFACE.encodeFunctionData("transfer", [
      safeAddress,
      amountBigInt,
    ]);

    const safeTransaction: SafeTransaction = {
      to: USDC_ADDRESS,
      operation: OperationType.Call,
      data: transferData,
      value: "0",
    };

    // Execute transaction via relayer (gasless)
    const response = await client.execute(
      [safeTransaction],
      `Deposit ${amount} USDC to Safe wallet`
    );

    const result = await response.wait();

    if (result) {
      return NextResponse.json({
        success: true,
        transactionHash: result.transactionHash,
        state: result.state,
      });
    } else {
      return NextResponse.json(
        { error: "Deposit transaction failed" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Deposit relayer API error:", error);
    return NextResponse.json(
      { 
        error: "Failed to deposit USDC",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}


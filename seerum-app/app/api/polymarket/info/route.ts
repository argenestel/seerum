import { NextRequest, NextResponse } from "next/server";
import { ClobClient } from "@polymarket/clob-client";
import { ethers } from "ethers";
import { Wallet } from "@ethersproject/wallet";
import { createPublicClient, http, Address } from "viem";
import { polygon } from "viem/chains";
import { USDC_ADDRESS } from "@/lib/utils/safe-wallet";

const CLOB_HOST = "https://clob.polymarket.com";
const CHAIN_ID = 137; // Polygon mainnet

const publicClient = createPublicClient({
  chain: polygon,
  transport: http(process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon-rpc.com"),
});

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const safeAddress = searchParams.get("safeAddress") as Address;
    const vaultPrivateKey = searchParams.get("vaultPrivateKey"); // Optional, for API balance check

    if (!safeAddress) {
      return NextResponse.json(
        { error: "safeAddress is required" },
        { status: 400 }
      );
    }

    const info: any = {
      safeAddress,
      onChainBalance: "0",
      polymarketBalance: null,
      depositAddress: safeAddress,
    };

    // Check on-chain USDC balance
    try {
      const balance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: [
          {
            inputs: [{ name: "account", type: "address" }],
            name: "balanceOf",
            outputs: [{ name: "", type: "uint256" }],
            stateMutability: "view",
            type: "function",
          },
        ],
        functionName: "balanceOf",
        args: [safeAddress],
      });

      // USDC has 6 decimals
      info.onChainBalance = (Number(balance) / 1e6).toFixed(6);
    } catch (error) {
      console.error("Error checking on-chain balance:", error);
    }

    // Try to get Polymarket balance via API if vault private key provided
    if (vaultPrivateKey) {
      try {
        const wallet = new Wallet(vaultPrivateKey);
        const provider = new ethers.providers.JsonRpcProvider(
          process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon-rpc.com"
        );
        const connectedWallet = wallet.connect(provider);

        const clobClient = new ClobClient(CLOB_HOST, CHAIN_ID, connectedWallet);
        
        // Try to create/derive API key
        try {
          const apiCreds = await clobClient.createOrDeriveApiKey();
          (clobClient as any).creds = apiCreds;

          // Try to get balance
          try {
            const balanceData = await (clobClient as any).getBalanceAllowance?.();
            if (balanceData) {
              info.polymarketBalance = balanceData.balance || balanceData.availableBalance || null;
            }
          } catch (balanceError: any) {
            console.log("Could not get Polymarket balance:", balanceError.message);
          }
        } catch (apiError: any) {
          console.log("Could not create API credentials:", apiError.message);
        }
      } catch (error) {
        console.error("Error checking Polymarket balance:", error);
      }
    }

    return NextResponse.json(
      {
        success: true,
        ...info,
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Polymarket info error:", error);
    return NextResponse.json(
      {
        error: "Failed to get Polymarket info",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


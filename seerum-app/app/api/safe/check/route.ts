import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, Address } from "viem";
import { polygon } from "viem/chains";
import { SAFE_ABI, SAFE_FACTORY_ADDRESS } from "@/lib/utils/safe-wallet";

const publicClient = createPublicClient({
  chain: polygon,
  transport: http(process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon-rpc.com"),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userAddress = searchParams.get("address") as Address;

    if (!userAddress) {
      return NextResponse.json(
        { error: "Address parameter is required" },
        { status: 400 }
      );
    }

    try {
      const safeAddress = await publicClient.readContract({
        address: SAFE_FACTORY_ADDRESS,
        abi: [
          {
            inputs: [{ name: "user", type: "address" }],
            name: "computeProxyAddress",
            outputs: [{ name: "", type: "address" }],
            stateMutability: "view",
            type: "function",
          },
        ],
        functionName: "computeProxyAddress",
        args: [userAddress],
      });

      // Check if Safe is deployed by checking bytecode
      const code = await publicClient.getBytecode({ address: safeAddress });
      const isDeployed = code && code !== "0x";

      if (!isDeployed) {
        return NextResponse.json({
          exists: false,
          address: safeAddress,
          isSafe: false,
        });
      }

      // Verify it's a Safe contract by checking nonce
      try {
        await publicClient.readContract({
          address: safeAddress,
          abi: SAFE_ABI,
          functionName: "nonce",
        });

        return NextResponse.json({
          exists: true,
          address: safeAddress,
          isSafe: true,
        });
      } catch {
        // Address exists but might not be a Safe
        return NextResponse.json({
          exists: true,
          address: safeAddress,
          isSafe: false,
        });
      }
    } catch (error) {
      console.error("Error checking Safe:", error);
      return NextResponse.json(
        { 
          error: "Failed to check Safe wallet", 
          message: error instanceof Error ? error.message : "Unknown error",
          exists: false,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Safe check API error:", error);
    return NextResponse.json(
      { error: "Failed to check Safe wallet" },
      { status: 500 }
    );
  }
}


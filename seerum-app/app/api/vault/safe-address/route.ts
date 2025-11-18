import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, Address } from "viem";
import { polygon } from "viem/chains";
import { SAFE_FACTORY_ADDRESS, SAFE_FACTORY_ABI } from "@/lib/utils/safe-wallet";
import { vaultStore } from "@/lib/utils/vault-store";

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
    const userAddress = searchParams.get("userAddress") as Address;
    const vaultId = searchParams.get("vaultId");
    const vaultAddressParam = searchParams.get("vaultAddress") as Address;

    if (!userAddress && !vaultId && !vaultAddressParam) {
      return NextResponse.json(
        { error: "userAddress, vaultId, or vaultAddress is required" },
        { status: 400 }
      );
    }

    let vaultAddress: Address;

    if (vaultAddressParam) {
      // Direct vault address provided
      vaultAddress = vaultAddressParam;
    } else if (vaultId) {
      // Get vault by ID
      const vault = await vaultStore.getById(vaultId);
      if (!vault) {
        return NextResponse.json(
          { error: "Vault not found" },
          { status: 404 }
        );
      }
      vaultAddress = vault.vaultAddress as Address;
    } else {
      // Get vault by user address
      const vault = await vaultStore.getByUserAddress(userAddress);
      if (!vault) {
        return NextResponse.json(
          { error: "Vault not found for user address" },
          { status: 404 }
        );
      }
      vaultAddress = vault.vaultAddress as Address;
    }

    // Compute Safe address from vault address
    const safeAddress = await publicClient.readContract({
      address: SAFE_FACTORY_ADDRESS,
      abi: SAFE_FACTORY_ABI,
      functionName: "computeProxyAddress",
      args: [vaultAddress],
    });

    // Check if Safe is deployed
    const code = await publicClient.getBytecode({ address: safeAddress });
    const isDeployed = code && code !== "0x";

    return NextResponse.json(
      {
        success: true,
        vaultAddress,
        safeAddress: safeAddress as string,
        isDeployed,
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Safe address computation error:", error);
    return NextResponse.json(
      {
        error: "Failed to compute Safe address",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


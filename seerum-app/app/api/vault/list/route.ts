import { NextRequest, NextResponse } from "next/server";
import { vaultStore } from "@/lib/utils/vault-store";

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
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get("userAddress");

    if (!userAddress) {
      return NextResponse.json(
        { error: "userAddress query parameter is required" },
        { status: 400 }
      );
    }

    // Find vault by user address
    const vault = await vaultStore.getByUserAddress(userAddress);

    if (!vault) {
      return NextResponse.json(
        { vault: null },
        {
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Return vault info (without encrypted private key)
    return NextResponse.json(
      {
        vault: {
          id: vault.id,
          userAddress: vault.userAddress,
          vaultAddress: vault.vaultAddress,
          createdAt: vault.createdAt,
          updatedAt: vault.updatedAt,
        },
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Vault list error:", error);
    return NextResponse.json(
      {
        error: "Failed to get vault",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


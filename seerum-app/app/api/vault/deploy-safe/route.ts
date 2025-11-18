import { NextRequest, NextResponse } from "next/server";
import { vaultStore } from "@/lib/utils/vault-store";
import { deploySafeFromVault } from "@/lib/utils/vault-safe";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userAddress, vaultId } = body;

    if (!userAddress && !vaultId) {
      return NextResponse.json(
        { error: "userAddress or vaultId is required" },
        { status: 400 }
      );
    }

    // Get vault
    let vault;
    if (vaultId) {
      vault = await vaultStore.getById(vaultId);
    } else {
      vault = await vaultStore.getByUserAddress(userAddress);
    }

    if (!vault) {
      return NextResponse.json(
        { error: "Vault not found" },
        { status: 404 }
      );
    }

    // Verify ownership if userAddress provided
    if (userAddress && vault.userAddress.toLowerCase() !== userAddress.toLowerCase()) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 403 }
      );
    }

    // Deploy Safe wallet from vault
    const result = await deploySafeFromVault(vault.privateKey);

    return NextResponse.json(
      {
        success: true,
        vaultAddress: vault.vaultAddress,
        safeAddress: result.safeAddress,
        transactionHash: result.transactionHash,
        message: "Safe wallet deployed successfully",
      },
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Safe deployment error:", error);
    return NextResponse.json(
      {
        error: "Failed to deploy Safe wallet",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


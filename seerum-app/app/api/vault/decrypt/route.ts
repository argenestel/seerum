import { NextRequest, NextResponse } from "next/server";
import { vaultStore } from "@/lib/utils/vault-store";

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

    if (!userAddress || !vaultId) {
      return NextResponse.json(
        { error: "userAddress and vaultId are required" },
        { status: 400 }
      );
    }

    // Get vault
    const vault = await vaultStore.getById(vaultId);

    if (!vault) {
      return NextResponse.json(
        { error: "Vault not found" },
        { status: 404 }
      );
    }

    // Verify ownership (no signature needed since private key is unencrypted)
    if (vault.userAddress.toLowerCase() !== userAddress.toLowerCase()) {
      return NextResponse.json(
        { error: "Vault access denied" },
        { status: 403 }
      );
    }

    // Return private key directly (no decryption or signature needed)
    return NextResponse.json(
      {
        success: true,
        privateKey: vault.privateKey,
        vaultId: vault.id,
        vaultAddress: vault.vaultAddress,
      },
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Vault access error:", error);
    return NextResponse.json(
      {
        error: "Failed to access vault",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

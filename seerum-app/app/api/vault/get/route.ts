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

    // Get vault by user address
    const vault = await vaultStore.getByUserAddress(userAddress);
    
    if (!vault) {
      return NextResponse.json(
        { error: "Vault not found" },
        { status: 404 }
      );
    }

    // Return vault info (without private key)
    return NextResponse.json(
      {
        success: true,
        id: vault.id,
        userAddress: vault.userAddress,
        vaultAddress: vault.vaultAddress,
        createdAt: vault.createdAt.toISOString(),
        updatedAt: vault.updatedAt.toISOString(),
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Vault get error:", error);
    return NextResponse.json(
      {
        error: "Failed to get vault",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Keep POST for backward compatibility (signature-based access)
  const { ethers } = await import("ethers");
  
  const VAULT_ACCESS_MESSAGE = (userAddress: string, vaultId: string) =>
    `Access Seerum Vault Wallet\n\nVault ID: ${vaultId}\nAddress: ${userAddress}\n\nThis signature grants access to decrypt your vault wallet.`;

  try {
    const body = await request.json();
    const { userAddress, vaultId, signature, message } = body;

    if (!userAddress || !vaultId || !signature || !message) {
      return NextResponse.json(
        { error: "userAddress, vaultId, signature, and message are required" },
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

    // Verify ownership
    if (vault.userAddress.toLowerCase() !== userAddress.toLowerCase()) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 403 }
      );
    }

    // Verify signature
    const expectedMessage = VAULT_ACCESS_MESSAGE(userAddress, vaultId);
    if (message !== expectedMessage) {
      return NextResponse.json(
        { error: "Invalid message" },
        { status: 400 }
      );
    }

    try {
      const recoveredAddress = ethers.utils.verifyMessage(message, signature);
      if (recoveredAddress.toLowerCase() !== userAddress.toLowerCase()) {
        return NextResponse.json(
          { error: "Signature verification failed" },
          { status: 401 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid signature format" },
        { status: 400 }
      );
    }

    // Return vault info (without decrypted private key)
    return NextResponse.json(
      {
        success: true,
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
    console.error("Vault get error:", error);
    return NextResponse.json(
      {
        error: "Failed to get vault",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


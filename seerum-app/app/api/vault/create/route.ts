import { NextRequest, NextResponse } from "next/server";
import { generatePrivateKey } from "@/lib/utils/encryption";
import { vaultStore } from "@/lib/utils/vault-store";
import { ethers } from "ethers";

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
    const { userAddress } = body;

    if (!userAddress) {
      return NextResponse.json(
        { error: "userAddress is required" },
        { status: 400 }
      );
    }

    // Check if vault already exists
    const existingVault = await vaultStore.getByUserAddress(userAddress);

    if (existingVault) {
      return NextResponse.json(
        {
          error: "Vault already exists",
          vaultId: existingVault.id,
          vaultAddress: existingVault.vaultAddress,
        },
        { status: 409 }
      );
    }

    // Generate new wallet
    const privateKey = generatePrivateKey();
    const wallet = new ethers.Wallet(privateKey);
    const vaultAddress = wallet.address;

    // Store vault with unencrypted private key (server can access directly)
    const vault = await vaultStore.create({
      userAddress: userAddress.toLowerCase(),
      vaultAddress,
      privateKey, // Store unencrypted for server access
    });

    return NextResponse.json(
      {
        success: true,
        vaultId: vault.id,
        vaultAddress: vault.vaultAddress,
        message: "Vault created successfully",
      },
      {
        status: 201,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Vault creation error:", error);
    
    // Provide more detailed error messages
    let errorMessage = "Failed to create vault";
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Check for common Supabase errors
      if (error.message.includes("SUPABASE_URL") || error.message.includes("SUPABASE_KEY")) {
        errorMessage = "Supabase configuration error. Please check your environment variables.";
      } else if (error.message.includes("PGRST116") || error.message.includes("relation") || error.message.includes("does not exist")) {
        errorMessage = "Vaults table does not exist in Supabase. Please run the SQL schema to create it.";
      } else if (error.message.includes("duplicate key") || error.message.includes("unique constraint")) {
        errorMessage = "A vault already exists for this user address.";
      }
    }
    
    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}


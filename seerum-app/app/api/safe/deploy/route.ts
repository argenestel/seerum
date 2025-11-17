import { NextRequest, NextResponse } from "next/server";

// This endpoint will prepare the transaction data for Safe deployment
// The actual signing and execution happens on the client side
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { owner } = body;

    if (!owner) {
      return NextResponse.json(
        { error: "Owner address is required" },
        { status: 400 }
      );
    }

    // Return the transaction data needed to deploy Safe
    // The client will sign and execute this transaction
    return NextResponse.json({
      factoryAddress: "0xaacFeEa03eb1561C4e67d661e40682Bd20E3541b",
      functionName: "createProxy",
      args: [
        "0x0000000000000000000000000000000000000000", // paymentToken
        "0", // payment
        "0x0000000000000000000000000000000000000000", // paymentReceiver
        "0x", // signature (will be added by client)
      ],
      // Note: The signature needs to be created on the client side
      // using the owner's wallet
    });
  } catch (error) {
    console.error("Safe deploy API error:", error);
    return NextResponse.json(
      { error: "Failed to prepare Safe deployment" },
      { status: 500 }
    );
  }
}


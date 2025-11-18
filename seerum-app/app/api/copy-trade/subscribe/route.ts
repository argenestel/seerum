import { NextRequest, NextResponse } from "next/server";

const LISTENER_SERVER_URL =
  process.env.NEXT_PUBLIC_LISTENER_SERVER_URL || process.env.LISTENER_SERVER_URL || "http://localhost:3002";

// Health check function
async function checkListenerServer(): Promise<boolean> {
  try {
    const response = await fetch(`${LISTENER_SERVER_URL}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, DELETE, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

/**
 * Subscribe to copy trades from a trader
 */
export async function POST(request: NextRequest) {
  try {
    // Check if listener server is reachable
    const isServerReachable = await checkListenerServer();
    if (!isServerReachable) {
      return NextResponse.json(
        {
          error: "Listener server not available",
          message: `Cannot connect to listener server at ${LISTENER_SERVER_URL}. Please ensure the listener server is running on port 3002. Check your .env.local file for NEXT_PUBLIC_LISTENER_SERVER_URL.`,
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { subscriberAddress, traderAddress, percentage } = body;

    if (!subscriberAddress || !traderAddress) {
      return NextResponse.json(
        { error: "subscriberAddress and traderAddress are required" },
        { status: 400 }
      );
    }

    // Validate percentage if provided
    let copyPercentage = percentage !== undefined ? parseFloat(percentage) : 100;
    if (isNaN(copyPercentage) || copyPercentage <= 0 || copyPercentage > 100) {
      return NextResponse.json(
        { error: "percentage must be a number between 1 and 100" },
        { status: 400 }
      );
    }

    let response: Response;
    try {
      response = await fetch(`${LISTENER_SERVER_URL}/subscribers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscriberAddress,
          traderAddress,
          percentage: copyPercentage,
        }),
        // Add timeout
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });
    } catch (fetchError) {
      console.error("Fetch error:", fetchError);
      if (fetchError instanceof Error && fetchError.name === "TimeoutError") {
        return NextResponse.json(
          {
            error: "Listener server timeout",
            message: `Failed to connect to listener server at ${LISTENER_SERVER_URL}. Please ensure the listener server is running.`,
          },
          { status: 503 }
        );
      }
      return NextResponse.json(
        {
          error: "Failed to connect to listener server",
          message: `Cannot reach listener server at ${LISTENER_SERVER_URL}. Error: ${fetchError instanceof Error ? fetchError.message : "Unknown error"}. Please ensure the listener server is running on port 3002.`,
        },
        { status: 503 }
      );
    }

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      return NextResponse.json(
        {
          error: errorData.error || "Failed to subscribe",
          message: errorData.message || `Listener server returned status ${response.status}`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, {
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Subscribe error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Check if it's a connection error
    if (errorMessage.includes("ECONNREFUSED") || errorMessage.includes("fetch failed")) {
      return NextResponse.json(
        {
          error: "Listener server not reachable",
          message: `Cannot connect to listener server at ${LISTENER_SERVER_URL}. Please ensure the listener server is running on port 3002.`,
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      {
        error: "Failed to subscribe",
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * Unsubscribe from copying trades from a trader
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscriberAddress, traderAddress } = body;

    if (!subscriberAddress || !traderAddress) {
      return NextResponse.json(
        { error: "subscriberAddress and traderAddress are required" },
        { status: 400 }
      );
    }

    let response: Response;
    try {
      response = await fetch(`${LISTENER_SERVER_URL}/subscribers`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscriberAddress,
          traderAddress,
        }),
        signal: AbortSignal.timeout(10000),
      });
    } catch (fetchError) {
      console.error("Fetch error:", fetchError);
      return NextResponse.json(
        {
          error: "Failed to connect to listener server",
          message: `Cannot reach listener server at ${LISTENER_SERVER_URL}. Please ensure the listener server is running.`,
        },
        { status: 503 }
      );
    }

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      return NextResponse.json(
        {
          error: errorData.error || "Failed to unsubscribe",
          message: errorData.message || `Listener server returned status ${response.status}`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, {
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return NextResponse.json(
      {
        error: "Failed to unsubscribe",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Get user's subscriptions
 */
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

    let response: Response;
    try {
      response = await fetch(
        `${LISTENER_SERVER_URL}/subscribers/user/${userAddress}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(10000),
        }
      );
    } catch (fetchError) {
      console.error("Fetch error:", fetchError);
      return NextResponse.json(
        {
          error: "Failed to connect to listener server",
          message: `Cannot reach listener server at ${LISTENER_SERVER_URL}. Please ensure the listener server is running.`,
        },
        { status: 503 }
      );
    }

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      return NextResponse.json(
        {
          error: errorData.error || "Failed to get subscriptions",
          message: errorData.message || `Listener server returned status ${response.status}`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, {
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Get subscriptions error:", error);
    return NextResponse.json(
      {
        error: "Failed to get subscriptions",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


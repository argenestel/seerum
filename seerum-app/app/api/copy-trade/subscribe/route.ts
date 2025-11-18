import { NextRequest, NextResponse } from "next/server";

const LISTENER_SERVER_URL =
  process.env.NEXT_PUBLIC_LISTENER_SERVER_URL || process.env.LISTENER_SERVER_URL || "http://localhost:3002";

// Health check function
async function checkListenerServer(): Promise<boolean> {
  const healthUrl = `${LISTENER_SERVER_URL}/health`;
  console.log(`[Health Check] Checking listener server at: ${healthUrl}`);
  
  try {
    const response = await fetch(healthUrl, {
      method: "GET",
      signal: AbortSignal.timeout(15000), // Increased to 15 seconds for Render cold starts
    });
    const isOk = response.ok;
    console.log(`[Health Check] Response status: ${response.status}, OK: ${isOk}`);
    return isOk;
  } catch (error) {
    console.error(`[Health Check] Failed to reach listener server:`, {
      url: healthUrl,
      error: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : 'Unknown',
    });
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
    console.log(`[Subscribe] Using listener server URL: ${LISTENER_SERVER_URL}`);
    
    // Check if listener server is reachable
    const isServerReachable = await checkListenerServer();
    if (!isServerReachable) {
      console.error(`[Subscribe] Listener server not reachable at ${LISTENER_SERVER_URL}`);
      return NextResponse.json(
        {
          error: "Listener server not available",
          message: `Cannot connect to listener server at ${LISTENER_SERVER_URL}. Please ensure the listener server is running. Check your environment variables: NEXT_PUBLIC_LISTENER_SERVER_URL or LISTENER_SERVER_URL.`,
        },
        { status: 503 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error("[Subscribe] Failed to parse request body:", parseError);
      return NextResponse.json(
        {
          error: "Invalid request body",
          message: "Request body must be valid JSON",
        },
        { status: 400 }
      );
    }

    const { subscriberAddress, traderAddress, percentage } = body;

    // Log the request body for debugging
    console.log("[Subscribe] Request body:", {
      subscriberAddress,
      traderAddress,
      percentage,
      hasSubscriber: !!subscriberAddress,
      hasTrader: !!traderAddress,
    });

    if (!subscriberAddress || !traderAddress) {
      console.error("[Subscribe] Missing required fields:", {
        subscriberAddress: !!subscriberAddress,
        traderAddress: !!traderAddress,
        body,
      });
      return NextResponse.json(
        { 
          error: "subscriberAddress and traderAddress are required",
          received: {
            subscriberAddress: !!subscriberAddress,
            traderAddress: !!traderAddress,
          }
        },
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
        const text = await response.text();
        try {
          errorData = JSON.parse(text);
      } catch {
          errorData = { 
            error: `HTTP ${response.status}: ${response.statusText}`,
            message: text || `Listener server returned status ${response.status}`
          };
        }
      } catch (parseError) {
        console.error("[Subscribe] Failed to parse error response:", parseError);
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      
      console.error(`[Subscribe] Listener server error:`, {
        status: response.status,
        statusText: response.statusText,
        errorData,
        url: `${LISTENER_SERVER_URL}/subscribers`,
      });
      
      return NextResponse.json(
        {
          error: errorData.error || "Failed to subscribe",
          message: errorData.message || `Listener server returned status ${response.status}`,
        },
        { status: response.status >= 400 && response.status < 600 ? response.status : 500 }
      );
    }

    let data;
    try {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        console.error("[Subscribe] Failed to parse response as JSON:", text);
        return NextResponse.json(
          {
            error: "Invalid response from listener server",
            message: "Listener server returned non-JSON response",
          },
          { status: 502 }
        );
      }
    } catch (parseError) {
      console.error("[Subscribe] Failed to read response:", parseError);
      return NextResponse.json(
        {
          error: "Failed to read response from listener server",
          message: parseError instanceof Error ? parseError.message : "Unknown error",
        },
        { status: 502 }
      );
    }

    return NextResponse.json(data, {
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("[Subscribe] Unexpected error:", error);
    console.error("[Subscribe] Error details:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Check if it's a connection error
    if (
      errorMessage.includes("ECONNREFUSED") || 
      errorMessage.includes("fetch failed") ||
      errorMessage.includes("network") ||
      (error instanceof Error && error.name === "TypeError")
    ) {
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
        details: process.env.NODE_ENV === "development" ? (error instanceof Error ? error.stack : undefined) : undefined,
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
    
    // Transform snake_case to camelCase for frontend compatibility
    if (data.subscriptions && Array.isArray(data.subscriptions)) {
      data.subscriptions = data.subscriptions.map((sub: any) => ({
        _id: sub.id,
        address: sub.address,
        traderAddress: sub.trader_address || sub.traderAddress, // Support both formats
        percentage: sub.percentage ? parseFloat(sub.percentage) : 100,
        active: sub.active,
        createdAt: sub.created_at,
        updatedAt: sub.updated_at,
      }));
    }
    
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


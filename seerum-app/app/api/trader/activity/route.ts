import { NextRequest, NextResponse } from "next/server";

const DATA_API_BASE = "https://data-api.polymarket.com/v1";
const CLOB_API_BASE = "https://clob.polymarket.com";

// Enable CORS
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
    const address = searchParams.get("address");
    const market = searchParams.get("market");
    const limit = searchParams.get("limit") || "50";
    const offset = searchParams.get("offset") || "0";

    if (!address) {
      return NextResponse.json(
        { error: "Address parameter is required" },
        { 
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }
      );
    }

    // Try multiple endpoints to get trader activity
    // First try the activity endpoint
    let response = await fetch(
      `${DATA_API_BASE}/activity?user=${address}&limit=${limit}&offset=${offset}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        next: { revalidate: 30 },
      }
    );

    // If activity endpoint doesn't work, try trades endpoint
    if (!response.ok) {
      const params = new URLSearchParams({
        taker: address,
        limit,
        offset,
      });

      if (market) {
        params.append("market", market);
      }

      // Try CLOB trades endpoint (may require auth, but worth trying)
      response = await fetch(
        `${CLOB_API_BASE}/data/trades?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          next: { revalidate: 30 },
        }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Polymarket API error:", response.status, errorText);
      
      // Return empty array if not found rather than error
      return NextResponse.json(
        { trades: [], total: 0 },
        {
          status: 200,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
          },
        }
      );
    }

    const data = await response.json();

    // Normalize response format
    const normalizedData = {
      trades: Array.isArray(data) ? data : data.trades || data.data || [],
      total: data.total || (Array.isArray(data) ? data.length : 0),
    };

    return NextResponse.json(normalizedData, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("Trader activity API error:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch trader activity",
        message: error instanceof Error ? error.message : "Unknown error",
        trades: [],
        total: 0,
      },
      { 
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }
    );
  }
}


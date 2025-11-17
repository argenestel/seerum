import { NextRequest, NextResponse } from "next/server";

const GAMMA_API_BASE = "https://gamma-api.polymarket.com";

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
    // Fetch active markets, get the first one
    const response = await fetch(
      `${GAMMA_API_BASE}/markets?closed=false&limit=1&offset=0`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        next: { revalidate: 60 },
      }
    );

    if (!response.ok) {
      throw new Error(`Gamma API error: ${response.status}`);
    }

    const data = await response.json();
    const markets = Array.isArray(data) ? data : data.data || [];

    if (markets.length === 0) {
      return NextResponse.json(
        { error: "No active markets found" },
        {
          status: 404,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }
      );
    }

    const market = markets[0];

    // Get market details with outcomes
    const marketDetailsResponse = await fetch(
      `${GAMMA_API_BASE}/markets/${market.slug || market.id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        next: { revalidate: 60 },
      }
    );

    let marketDetails = market;
    if (marketDetailsResponse.ok) {
      const details = await marketDetailsResponse.json();
      marketDetails = { ...market, ...details };
    }

    return NextResponse.json(
      {
        market: marketDetails,
      },
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    console.error("Demo market API error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch demo market",
        message: error instanceof Error ? error.message : "Unknown error",
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


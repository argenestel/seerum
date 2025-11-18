import { NextRequest, NextResponse } from "next/server";

const DOME_API_BASE = "https://api.domeapi.io/v1";
const DOME_API_KEY = process.env.DOME_API_KEY;

if (!DOME_API_KEY) {
  console.error("DOME_API_KEY environment variable is not set");
}

// Enable CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const polymarketMarketSlugs = searchParams.getAll("polymarket_market_slug");
    const kalshiEventTickers = searchParams.getAll("kalshi_event_ticker");

    if (polymarketMarketSlugs.length === 0 && kalshiEventTickers.length === 0) {
      return NextResponse.json(
        {
          error: "Missing required parameter",
          message: "At least one polymarket_market_slug or kalshi_event_ticker is required",
        },
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        }
      );
    }

    if (!DOME_API_KEY) {
      return NextResponse.json(
        {
          error: "Configuration error",
          message: "API key not configured",
        },
        {
          status: 500,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        }
      );
    }

    // Build query parameters - append all values
    const params = new URLSearchParams();
    polymarketMarketSlugs.forEach(slug => {
      params.append("polymarket_market_slug", slug);
    });
    kalshiEventTickers.forEach(ticker => {
      params.append("kalshi_event_ticker", ticker);
    });

    // Fetch matching markets from Dome API
    const response = await fetch(
      `${DOME_API_BASE}/matching-markets/sports?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${DOME_API_KEY}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        next: { revalidate: 300 }, // Cache for 5 minutes
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Dome API error:", response.status, errorText);
      
      if (response.status === 404) {
        return NextResponse.json(
          {
            error: "Not found",
            message: "No matching markets found for the provided parameters",
          },
          {
            status: 404,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type, Authorization",
            },
          }
        );
      }

      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return NextResponse.json(data, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  } catch (error) {
    console.error("Error fetching matching markets:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Failed to fetch matching markets",
      },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    );
  }
}


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
    const sport = searchParams.get("sport");
    const date = searchParams.get("date");

    if (!sport || !date) {
      return NextResponse.json(
        {
          error: "Missing required parameter",
          message: "Both sport and date parameters are required",
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

    // Fetch matching markets from Dome API
    const response = await fetch(
      `${DOME_API_BASE}/matching-markets/sports/${sport}?date=${date}`,
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


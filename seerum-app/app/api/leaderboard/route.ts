import { NextRequest, NextResponse } from "next/server";

const DATA_API_BASE = "https://data-api.polymarket.com/v1";

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
    const timePeriod = searchParams.get("timePeriod") || "day";
    const orderBy = searchParams.get("orderBy") || "VOL";
    const limit = searchParams.get("limit") || "10";
    const offset = searchParams.get("offset") || "0";
    const user = searchParams.get("user");
    const category = searchParams.get("category") || "overall";

    const params = new URLSearchParams({
      timePeriod,
      orderBy,
      limit,
      offset,
      category,
    });

    if (user) {
      params.append("user", user);
    }

    // Server-side fetch to avoid CORS issues
    const response = await fetch(
      `${DATA_API_BASE}/leaderboard?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        // Add cache for better performance
        next: { revalidate: 30 }, // Revalidate every 30 seconds
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Polymarket API error:", response.status, errorText);
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Normalize the response - handle both array and object responses
    let normalizedData;
    if (Array.isArray(data)) {
      // If response is directly an array, wrap it
      normalizedData = {
        data: data.map((entry) => ({
          ...entry,
          user: entry.proxyWallet || entry.user, // Add user field for compatibility
          rank: typeof entry.rank === 'string' ? parseInt(entry.rank) : entry.rank,
          // Calculate ROI if not present: ROI = (PNL / Volume) * 100
          roi: entry.roi !== undefined 
            ? entry.roi 
            : entry.vol > 0 
              ? (entry.pnl / entry.vol) * 100 
              : 0,
        })),
        total: data.length,
      };
    } else if (data.data && Array.isArray(data.data)) {
      // If response has data property
      normalizedData = {
        ...data,
        data: data.data.map((entry: any) => ({
          ...entry,
          user: entry.proxyWallet || entry.user,
          rank: typeof entry.rank === 'string' ? parseInt(entry.rank) : entry.rank,
          roi: entry.roi !== undefined 
            ? entry.roi 
            : entry.vol > 0 
              ? (entry.pnl / entry.vol) * 100 
              : 0,
        })),
      };
    } else {
      normalizedData = data;
    }

    // Return with CORS headers
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
    console.error("Leaderboard API error:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch leaderboard",
        message: error instanceof Error ? error.message : "Unknown error"
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


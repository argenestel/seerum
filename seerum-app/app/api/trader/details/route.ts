import { NextRequest, NextResponse } from "next/server";

const DATA_API_BASE = "https://data-api.polymarket.com";
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
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get("address");

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

    // Fetch closed positions (what they got right)
    const closedPositionsResponse = await fetch(
      `${DATA_API_BASE}/closed-positions?user=${address}&sortBy=realizedpnl&sortDirection=DESC&limit=100&offset=0`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        next: { revalidate: 60 },
      }
    );

    let closedPositions = [];
    if (closedPositionsResponse.ok) {
      const closed = await closedPositionsResponse.json();
      closedPositions = Array.isArray(closed) ? closed : closed.data || closed.positions || [];
    }

    // Fetch current positions
    const positionsResponse = await fetch(
      `${DATA_API_BASE}/positions?user=${address}&sortBy=CURRENT&sortDirection=DESC&sizeThreshold=.1&limit=100&offset=0`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        next: { revalidate: 60 },
      }
    );

    let positions = [];
    if (positionsResponse.ok) {
      const pos = await positionsResponse.json();
      positions = Array.isArray(pos) ? pos : pos.data || pos.positions || [];
    }

    // Fetch activity/trades
    const activityResponse = await fetch(
      `${DATA_API_BASE}/activity?user=${address}&limit=100&offset=0`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        next: { revalidate: 60 },
      }
    );

    let trades = [];
    if (activityResponse.ok) {
      const activity = await activityResponse.json();
      trades = Array.isArray(activity) ? activity : activity.trades || activity.data || [];
    }

    // Get unique market addresses to fetch market details
    const marketAddresses = new Set<string>();
    [...closedPositions, ...positions, ...trades].forEach((item) => {
      if (item.market) marketAddresses.add(item.market);
    });

    // Fetch market details for category analysis
    const marketDetails: Record<string, any> = {};
    const marketPromises = Array.from(marketAddresses).slice(0, 50).map(async (marketAddr) => {
      try {
        // Try to get market by address or slug
        const marketResponse = await fetch(
          `${GAMMA_API_BASE}/markets/${marketAddr}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
            },
            next: { revalidate: 300 }, // Cache for 5 minutes
          }
        );

        if (marketResponse.ok) {
          const marketData = await marketResponse.json();
          return { address: marketAddr, data: marketData };
        }
      } catch (error) {
        console.error(`Error fetching market ${marketAddr}:`, error);
      }
      return null;
    });

    const marketResults = await Promise.all(marketPromises);
    marketResults.forEach((result) => {
      if (result && result.data) {
        marketDetails[result.address] = result.data;
      }
    });

    // Analyze categories/tags from markets
    const categoryStats: Record<string, { count: number; pnl: number; wins: number; losses: number }> = {};
    
    closedPositions.forEach((position: any) => {
      const market = marketDetails[position.market];
      if (market && market.tags) {
        market.tags.forEach((tag: any) => {
          const tagName = tag.name || tag.slug || "Unknown";
          if (!categoryStats[tagName]) {
            categoryStats[tagName] = { count: 0, pnl: 0, wins: 0, losses: 0 };
          }
          categoryStats[tagName].count++;
          const pnl = parseFloat(position.realizedPnl || position.realized_pnl || "0");
          categoryStats[tagName].pnl += pnl;
          if (pnl > 0) {
            categoryStats[tagName].wins++;
          } else if (pnl < 0) {
            categoryStats[tagName].losses++;
          }
        });
      }
    });

    // Calculate trader IQ (win rate based on closed positions)
    const totalClosed = closedPositions.length;
    const winningPositions = closedPositions.filter(
      (p: any) => parseFloat(p.realizedPnl || p.realized_pnl || "0") > 0
    ).length;
    const traderIQ = totalClosed > 0 ? (winningPositions / totalClosed) * 100 : 0;

    return NextResponse.json(
      {
        closedPositions,
        positions,
        trades,
        marketDetails,
        categoryStats,
        traderIQ,
        totalClosed,
        winningPositions,
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
    console.error("Trader details API error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch trader details",
        message: error instanceof Error ? error.message : "Unknown error",
        closedPositions: [],
        positions: [],
        trades: [],
        marketDetails: {},
        categoryStats: {},
        traderIQ: 0,
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


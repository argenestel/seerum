import { NextRequest, NextResponse } from "next/server";

const DATA_API_BASE = "https://data-api.polymarket.com";
const USER_PNL_API_BASE = "https://user-pnl-api.polymarket.com";

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

    // Fetch user profile from leaderboard with user filter
    const leaderboardResponse = await fetch(
      `${DATA_API_BASE}/v1/leaderboard?user=${address}&timePeriod=all&orderBy=VOL&limit=1&offset=0&category=overall`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        next: { revalidate: 60 },
      }
    );

    let profileData = null;
    if (leaderboardResponse.ok) {
      const leaderboardData = await leaderboardResponse.json();
      if (Array.isArray(leaderboardData) && leaderboardData.length > 0) {
        profileData = leaderboardData[0];
      } else if (leaderboardData.data && Array.isArray(leaderboardData.data) && leaderboardData.data.length > 0) {
        profileData = leaderboardData.data[0];
      }
    }

    // Fetch user activity
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

    let activityData = [];
    if (activityResponse.ok) {
      const activity = await activityResponse.json();
      activityData = Array.isArray(activity) ? activity : activity.trades || activity.data || [];
    }

    // Fetch closed positions
    const closedPositionsResponse = await fetch(
      `${DATA_API_BASE}/closed-positions?user=${address}&sortBy=realizedpnl&sortDirection=DESC&limit=25&offset=0`,
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
      `${DATA_API_BASE}/positions?user=${address}&sortBy=CURRENT&sortDirection=DESC&sizeThreshold=.1&limit=50&offset=0`,
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

    // Fetch P&L data for graph
    const pnlResponse = await fetch(
      `${USER_PNL_API_BASE}/user-pnl?user_address=${address}&interval=1m&fidelity=1d`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        next: { revalidate: 300 }, // Cache for 5 minutes
      }
    );

    let pnlData = [];
    if (pnlResponse.ok) {
      const pnl = await pnlResponse.json();
      pnlData = Array.isArray(pnl) ? pnl : pnl.data || [];
    }

    // Calculate ROI if not present
    if (profileData && profileData.vol && profileData.pnl !== undefined) {
      const vol = typeof profileData.vol === "string" ? parseFloat(profileData.vol) : profileData.vol;
      const pnl = typeof profileData.pnl === "string" ? parseFloat(profileData.pnl) : profileData.pnl;
      if (vol > 0 && !profileData.roi) {
        profileData.roi = (pnl / vol) * 100;
      }
    }

    return NextResponse.json(
      {
        profile: profileData || {
          proxyWallet: address,
          vol: 0,
          pnl: 0,
          roi: 0,
          trades: 0,
          rank: null,
        },
        activity: activityData,
        closedPositions,
        positions,
        pnlData,
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
    console.error("User profile API error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch user profile",
        message: error instanceof Error ? error.message : "Unknown error",
        profile: null,
        activity: [],
        closedPositions: [],
        positions: [],
        pnlData: [],
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


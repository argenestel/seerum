import { NextRequest, NextResponse } from "next/server";

const DATA_API_BASE = "https://data-api.polymarket.com";
const GAMMA_API_BASE = "https://gamma-api.polymarket.com";

interface Trade {
  market?: string;
  title?: string;
  marketTitle?: string;
  slug?: string;
  marketSlug?: string;
  icon?: string;
  marketIcon?: string;
  conditionId?: string;
}

interface Position {
  market?: string;
  conditionId?: string;
  condition_id?: string;
  realizedPnl?: string | number;
  realized_pnl?: string | number;
}

interface MarketData {
  tags?: Array<{ name?: string; slug?: string }>;
  question?: string;
  title?: string;
  slug?: string;
  icon?: string;
  conditionId?: string;
}

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
      `${DATA_API_BASE}/positions?sizeThreshold=1&limit=100&sortBy=TOKENS&sortDirection=DESC&user=${address}`,
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

    // Get unique market identifiers (could be address, conditionId, or slug)
    const marketIdentifiers = new Set<string>();
    const conditionIdToMarketKey: Record<string, string> = {};
    
    [...closedPositions, ...positions, ...trades].forEach((item) => {
      const marketKey = item.market || item.conditionId || item.condition_id;
      if (marketKey) {
        marketIdentifiers.add(marketKey);
        // Track conditionId mapping if present
        if (item.conditionId || item.condition_id) {
          const condId = item.conditionId || item.condition_id;
          conditionIdToMarketKey[condId] = marketKey;
        }
      }
    });

    // Fetch market details for category analysis
    const marketDetails: Record<string, unknown> = {};
    const marketPromises = Array.from(marketIdentifiers).slice(0, 100).map(async (marketKey) => {
      try {
        // First try to get market by key (could be address, slug, or conditionId) from Gamma API
        const marketResponse = await fetch(
          `${GAMMA_API_BASE}/markets/${marketKey}`,
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
          return { key: marketKey, data: marketData };
        }

        // If that fails, try Data API
        const dataApiResponse = await fetch(
          `${DATA_API_BASE}/markets/${marketKey}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
            },
            next: { revalidate: 300 },
          }
        );

        if (dataApiResponse.ok) {
          const marketData = await dataApiResponse.json();
          return { key: marketKey, data: marketData };
        }

        // If that fails and it looks like a conditionId (long hex string), try searching
        if (marketKey.length === 66 && marketKey.startsWith('0x')) {
          // Try searching markets by conditionId in Gamma API
          const searchResponse = await fetch(
            `${GAMMA_API_BASE}/markets?conditionId=${marketKey}&limit=1`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
              },
              next: { revalidate: 300 },
            }
          );

          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            if (Array.isArray(searchData) && searchData.length > 0) {
              return { key: marketKey, data: searchData[0] };
            }
            if (searchData.data && Array.isArray(searchData.data) && searchData.data.length > 0) {
              return { key: marketKey, data: searchData.data[0] };
            }
          }

          // Try Data API search
          const dataSearchResponse = await fetch(
            `${DATA_API_BASE}/markets?conditionId=${marketKey}&limit=1`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
              },
              next: { revalidate: 300 },
            }
          );

          if (dataSearchResponse.ok) {
            const searchData = await dataSearchResponse.json();
            if (Array.isArray(searchData) && searchData.length > 0) {
              return { key: marketKey, data: searchData[0] };
            }
            if (searchData.data && Array.isArray(searchData.data) && searchData.data.length > 0) {
              return { key: marketKey, data: searchData.data[0] };
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching market ${marketKey}:`, error);
      }
      return null;
    });

    const marketResults = await Promise.all(marketPromises);
    marketResults.forEach((result) => {
      if (result && result.data) {
        marketDetails[result.key] = result.data;
        // Also map by conditionId if available
        if (result.data.conditionId) {
          marketDetails[result.data.conditionId] = result.data;
        }
        // Map by slug if available
        if (result.data.slug) {
          marketDetails[result.data.slug] = result.data;
        }
        // Map by market address/id if available
        if (result.data.id) {
          marketDetails[result.data.id] = result.data;
        }
      }
    });

    // Also try to map markets from trades data (trades often have better market info)
    trades.forEach((trade: Trade) => {
      if (trade.market && trade.title && !marketDetails[trade.market]) {
        // If we have market info from trade but haven't fetched it, create a basic entry
        if (!marketDetails[trade.market]) {
          marketDetails[trade.market] = {
            question: trade.title || trade.marketTitle,
            title: trade.title || trade.marketTitle,
            slug: trade.slug || trade.marketSlug,
            icon: trade.icon || trade.marketIcon,
          };
        }
      }
      // Map conditionId from trade to market if available
      if (trade.conditionId && trade.market && marketDetails[trade.market]) {
        marketDetails[trade.conditionId] = marketDetails[trade.market];
      }
    });

    // Analyze categories/tags from markets
    const categoryStats: Record<string, { count: number; pnl: number; wins: number; losses: number }> = {};
    
    closedPositions.forEach((position: Position) => {
      const market = marketDetails[position.market || ""] as MarketData | undefined;
      if (market && market.tags) {
        market.tags.forEach((tag) => {
          const tagName = tag.name || tag.slug || "Unknown";
          if (!categoryStats[tagName]) {
            categoryStats[tagName] = { count: 0, pnl: 0, wins: 0, losses: 0 };
          }
          categoryStats[tagName].count++;
          const pnl = parseFloat(String(position.realizedPnl || position.realized_pnl || "0"));
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
      (p: Position) => parseFloat(String(p.realizedPnl || p.realized_pnl || "0")) > 0
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


import { NextRequest, NextResponse } from "next/server";

const GAMMA_API_BASE = "https://gamma-api.polymarket.com";

// Helper function to extract token IDs from market data
function extractTokenIds(market: any): { [key: string]: string } {
  const tokenIds: { [key: string]: string } = {};
  
  // Parse clobTokenIds if it's a JSON string
  if (market.clobTokenIds) {
    try {
      let tokenIdArray: string[] = [];
      
      if (typeof market.clobTokenIds === "string") {
        // Parse JSON string array
        tokenIdArray = JSON.parse(market.clobTokenIds);
      } else if (Array.isArray(market.clobTokenIds)) {
        tokenIdArray = market.clobTokenIds;
      }
      
      // Parse outcomes to map token IDs
      let outcomesArray: string[] = [];
      if (market.outcomes) {
        if (typeof market.outcomes === "string") {
          outcomesArray = JSON.parse(market.outcomes);
        } else if (Array.isArray(market.outcomes)) {
          outcomesArray = market.outcomes;
        }
      }
      
      // Map outcomes to token IDs (Yes -> first token, No -> second token)
      if (tokenIdArray.length > 0 && outcomesArray.length > 0) {
        outcomesArray.forEach((outcome: string, index: number) => {
          if (tokenIdArray[index]) {
            tokenIds[outcome] = tokenIdArray[index];
          }
        });
      } else if (tokenIdArray.length === 2) {
        // Fallback: if no outcomes array, assume Yes/No
        tokenIds["Yes"] = tokenIdArray[0];
        tokenIds["No"] = tokenIdArray[1];
      }
    } catch (e) {
      console.error("Failed to parse clobTokenIds:", e);
    }
  }
  
  // Try tokens array
  if (market.tokens && Array.isArray(market.tokens)) {
    market.tokens.forEach((token: any) => {
      if (token.outcome && token.tokenId) {
        tokenIds[token.outcome] = token.tokenId;
      } else if (token.outcomeTitle && token.tokenId) {
        tokenIds[token.outcomeTitle] = token.tokenId;
      } else if (token.title && token.tokenId) {
        tokenIds[token.title] = token.tokenId;
      }
    });
  }
  
  // Try outcomeTokens object
  if (market.outcomeTokens && typeof market.outcomeTokens === "object") {
    Object.assign(tokenIds, market.outcomeTokens);
  }
  
  return tokenIds;
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
    // Fetch specific demo market: "Will Trump create a tariff dividend in 2025?"
    const eventSlug = "will-trump-create-a-tariff-dividend-in-2025";
    
    // Try fetching from events endpoint first (correct format: /events/slug/{slug})
    const eventResponse = await fetch(
      `${GAMMA_API_BASE}/events/slug/${eventSlug}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        next: { revalidate: 60 },
      }
    );

    if (eventResponse.ok) {
      const eventData = await eventResponse.json();
      
      // Events might have markets array, get the first active market
      if (eventData.markets && Array.isArray(eventData.markets) && eventData.markets.length > 0) {
        let market = eventData.markets.find((m: any) => !m.closed) || eventData.markets[0];
        
        // If market has a slug or id, fetch full market details to get token IDs
        if (market.slug || market.id) {
          try {
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
            
            if (marketDetailsResponse.ok) {
              const marketDetails = await marketDetailsResponse.json();
              market = { ...market, ...marketDetails };
            }
          } catch (e) {
            console.error("Failed to fetch market details:", e);
          }
        }
        
        // Ensure token IDs are extracted properly
        const extractedTokenIds = extractTokenIds(market);
        const processedMarket = {
          ...market,
          // Convert clobTokenIds string to object for easier use
          clobTokenIds: Object.keys(extractedTokenIds).length > 0 
            ? extractedTokenIds 
            : (market.clobTokenIds || {}),
        };
        
        return NextResponse.json(
          {
            market: processedMarket,
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
      }
      
      // If event data itself is a market, return it
      if (eventData.question || eventData.outcomes) {
        const extractedTokenIds = extractTokenIds(eventData);
        const processedMarket = {
          ...eventData,
          clobTokenIds: Object.keys(extractedTokenIds).length > 0 
            ? extractedTokenIds 
            : (eventData.clobTokenIds || {}),
        };
        
        return NextResponse.json(
          {
            market: processedMarket,
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
      }
    }

    // Fallback: try markets endpoint
    const marketDetailsResponse = await fetch(
      `${GAMMA_API_BASE}/markets?closed=false&limit=100&offset=0`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        next: { revalidate: 60 },
      }
    );

    if (!marketDetailsResponse.ok) {
      throw new Error(`Gamma API error: ${marketDetailsResponse.status}`);
    }

    const data = await marketDetailsResponse.json();
    const markets = Array.isArray(data) ? data : data.data || [];
    
    // Try to find the market by slug or question
    const market = markets.find((m: any) => 
      m.slug === eventSlug || 
      m.slug?.includes("trump-tariff-dividend") ||
      (m.question?.toLowerCase().includes("trump") && m.question?.toLowerCase().includes("tariff"))
    ) || markets[0];

    if (!market) {
      return NextResponse.json(
        { error: "Demo market not found" },
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

    // Ensure token IDs are extracted properly
    const extractedTokenIds = extractTokenIds(market);
    const marketDetails = {
      ...market,
      clobTokenIds: Object.keys(extractedTokenIds).length > 0 
        ? extractedTokenIds 
        : (market.clobTokenIds || {}),
    };

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


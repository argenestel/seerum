"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  TrendingUp,
  TrendingDown,
  Loader2,
  RefreshCw,
  AlertCircle,
  DollarSign,
  Zap,
  ArrowRightLeft,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Market {
  id: string;
  slug: string;
  question: string;
  outcomes: string[];
  clobTokenIds?: {
    [key: string]: string;
  };
  tokens?: Array<{
    outcome: string;
    tokenId: string;
  }>;
}

interface ArbitrageOpportunity {
  market1: Market;
  market2: Market;
  outcome: string;
  buyPrice: number;
  sellPrice: number;
  profitMargin: number;
  buyTokenId: string;
  sellTokenId: string;
  buyMarketSlug: string;
  sellMarketSlug: string;
}

export function ArbitrageScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [minProfitMargin, setMinProfitMargin] = useState(5); // Minimum 5% profit margin
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch markets from Polymarket API
  const { data: marketsData, isLoading: loadingMarkets, refetch: refetchMarkets } = useQuery<{
    markets: Market[];
  }>({
    queryKey: ["polymarketMarkets"],
    queryFn: async () => {
      const response = await fetch("https://clob.polymarket.com/markets");
      if (!response.ok) {
        throw new Error("Failed to fetch markets");
      }
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const markets = marketsData?.markets || [];

  // Scan for arbitrage opportunities
  const scanForArbitrage = async () => {
    if (markets.length === 0) return;

    setIsScanning(true);
    const foundOpportunities: ArbitrageOpportunity[] = [];

    try {
      // Group markets by similar questions/outcomes
      const marketGroups = new Map<string, Market[]>();

      markets.forEach((market) => {
        const key = market.question.toLowerCase().trim();
        if (!marketGroups.has(key)) {
          marketGroups.set(key, []);
        }
        marketGroups.get(key)!.push(market);
      });

      // For each group, compare prices
      for (const [question, groupMarkets] of marketGroups.entries()) {
        if (groupMarkets.length < 2) continue;

        // Compare each pair of markets
        for (let i = 0; i < groupMarkets.length; i++) {
          for (let j = i + 1; j < groupMarkets.length; j++) {
            const market1 = groupMarkets[i];
            const market2 = groupMarkets[j];

            // Get token IDs for both markets
            const tokenIds1 = getTokenIds(market1);
            const tokenIds2 = getTokenIds(market2);

            // Compare prices for each outcome
            for (const outcome of Object.keys(tokenIds1)) {
              if (!tokenIds2[outcome]) continue;

              const tokenId1 = tokenIds1[outcome];
              const tokenId2 = tokenIds2[outcome];

              try {
                // Fetch order books for both tokens
                const [book1, book2] = await Promise.all([
                  fetch(`https://clob.polymarket.com/book?token_id=${tokenId1}`).then((r) =>
                    r.json()
                  ),
                  fetch(`https://clob.polymarket.com/book?token_id=${tokenId2}`).then((r) =>
                    r.json()
                  ),
                ]);

                // Get best bid and ask prices
                const bestBid1 = book1?.bids?.[0]?.[0] ? parseFloat(book1.bids[0][0]) : null;
                const bestAsk1 = book1?.asks?.[0]?.[0] ? parseFloat(book1.asks[0][0]) : null;
                const bestBid2 = book2?.bids?.[0]?.[0] ? parseFloat(book2.bids[0][0]) : null;
                const bestAsk2 = book2?.asks?.[0]?.[0] ? parseFloat(book2.asks[0][0]) : null;

                if (!bestBid1 || !bestAsk1 || !bestBid2 || !bestAsk2) continue;

                // Check for arbitrage: buy low, sell high
                // Opportunity 1: Buy in market1, sell in market2
                if (bestAsk1 < bestBid2) {
                  const profitMargin = ((bestBid2 - bestAsk1) / bestAsk1) * 100;
                  if (profitMargin >= minProfitMargin) {
                    foundOpportunities.push({
                      market1,
                      market2,
                      outcome,
                      buyPrice: bestAsk1,
                      sellPrice: bestBid2,
                      profitMargin,
                      buyTokenId: tokenId1,
                      sellTokenId: tokenId2,
                      buyMarketSlug: market1.slug,
                      sellMarketSlug: market2.slug,
                    });
                  }
                }

                // Opportunity 2: Buy in market2, sell in market1
                if (bestAsk2 < bestBid1) {
                  const profitMargin = ((bestBid1 - bestAsk2) / bestAsk2) * 100;
                  if (profitMargin >= minProfitMargin) {
                    foundOpportunities.push({
                      market1: market2,
                      market2: market1,
                      outcome,
                      buyPrice: bestAsk2,
                      sellPrice: bestBid1,
                      profitMargin,
                      buyTokenId: tokenId2,
                      sellTokenId: tokenId1,
                      buyMarketSlug: market2.slug,
                      sellMarketSlug: market1.slug,
                    });
                  }
                }
              } catch (error) {
                // Skip if we can't fetch order book
                continue;
              }
            }
          }
        }
      }

      // Sort by profit margin (highest first)
      foundOpportunities.sort((a, b) => b.profitMargin - a.profitMargin);
      setOpportunities(foundOpportunities.slice(0, 50)); // Limit to top 50
    } catch (error) {
      console.error("Error scanning for arbitrage:", error);
    } finally {
      setIsScanning(false);
    }
  };

  // Helper function to extract token IDs from market
  const getTokenIds = (market: Market): { [key: string]: string } => {
    if (market.clobTokenIds) {
      return market.clobTokenIds;
    }
    if (market.tokens) {
      const result: { [key: string]: string } = {};
      market.tokens.forEach((token) => {
        result[token.outcome] = token.tokenId;
      });
      return result;
    }
    return {};
  };

  // Auto-scan when markets are loaded
  useEffect(() => {
    if (markets.length > 0 && !isScanning) {
      scanForArbitrage();
    }
  }, [markets.length]);

  // Filter opportunities by search query
  const filteredOpportunities = opportunities.filter((opp) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      opp.market1.question.toLowerCase().includes(query) ||
      opp.market2.question.toLowerCase().includes(query) ||
      opp.outcome.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="backdrop-blur-xl bg-white/5 dark:bg-black/5 border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-semibold mb-2 flex items-center gap-2">
              <Zap className="h-6 w-6 text-yellow-500" />
              Arbitrage Scanner
            </h3>
            <p className="text-sm text-muted-foreground">
              Scan for price differences across different markets to find profitable arbitrage opportunities
            </p>
          </div>
          <button
            onClick={scanForArbitrage}
            disabled={isScanning || loadingMarkets}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isScanning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Scan Now
              </>
            )}
          </button>
        </div>

        {/* Controls */}
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search markets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Min Profit:</label>
            <input
              type="number"
              min="0"
              max="100"
              value={minProfitMargin}
              onChange={(e) => setMinProfitMargin(parseFloat(e.target.value) || 0)}
              className="w-20 px-3 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Markets:</span>
            <span className="font-medium">{markets.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Opportunities:</span>
            <span className="font-medium">{filteredOpportunities.length}</span>
          </div>
          {isScanning && (
            <div className="flex items-center gap-2 text-yellow-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Scanning markets...</span>
            </div>
          )}
        </div>
      </div>

      {/* Opportunities List */}
      {loadingMarkets ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredOpportunities.length === 0 ? (
        <div className="backdrop-blur-xl bg-white/5 dark:bg-black/5 border border-border rounded-2xl p-12 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Arbitrage Opportunities Found</h3>
          <p className="text-sm text-muted-foreground">
            {isScanning
              ? "Scanning markets for opportunities..."
              : "Try adjusting the minimum profit margin or scan again to find new opportunities."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOpportunities.map((opp, index) => (
            <div
              key={`${opp.buyTokenId}-${opp.sellTokenId}-${index}`}
              className="backdrop-blur-xl bg-white/5 dark:bg-black/5 border border-border rounded-2xl p-6 hover:border-primary/50 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 rounded bg-green-500/20 text-green-500 text-xs font-medium">
                      {opp.profitMargin.toFixed(2)}% Profit
                    </span>
                    <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-500 text-xs font-medium">
                      {opp.outcome}
                    </span>
                  </div>
                  <h4 className="font-medium mb-3 line-clamp-2">{opp.market1.question}</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Buy Side */}
                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium text-green-500">Buy At</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1 truncate">
                        {opp.buyMarketSlug}
                      </p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(opp.buyPrice)}
                      </p>
                    </div>

                    {/* Sell Side */}
                    <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-red-500" />
                        <span className="text-sm font-medium text-red-500">Sell At</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1 truncate">
                        {opp.sellMarketSlug}
                      </p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(opp.sellPrice)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="ml-4 flex flex-col items-center justify-center gap-2">
                  <ArrowRightLeft className="h-6 w-6 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-500">
                      +{opp.profitMargin.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">Margin</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex gap-2 pt-4 border-t border-border">
                <a
                  href={`https://polymarket.com/event/${opp.buyMarketSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-all text-center text-sm"
                >
                  Buy @ {formatCurrency(opp.buyPrice)}
                </a>
                <a
                  href={`https://polymarket.com/event/${opp.sellMarketSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-all text-center text-sm"
                >
                  Sell @ {formatCurrency(opp.sellPrice)}
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


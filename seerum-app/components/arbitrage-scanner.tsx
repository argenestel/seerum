"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  AlertCircle,
  ExternalLink,
  ArrowRightLeft,
} from "lucide-react";

interface MatchingMarket {
  platform: "POLYMARKET" | "KALSHI";
  market_slug?: string;
  event_ticker?: string;
  token_ids?: string[];
  market_tickers?: string[];
}

interface MatchingMarketsResponse {
  markets: {
    [key: string]: MatchingMarket[];
  };
  sport: string;
  date: string;
}

const SPORTS = [
  { value: "nfl", label: "NFL" },
  { value: "mlb", label: "MLB" },
  { value: "cfb", label: "CFB" },
  { value: "nba", label: "NBA" },
  { value: "nhl", label: "NHL" },
];

// Generate dates for next 7 days
const getUpcomingDates = () => {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(date.toISOString().split("T")[0]);
  }
  return dates;
};

export function ArbitrageScanner() {
  const [selectedSport, setSelectedSport] = useState("nfl");
  const [selectedDate, setSelectedDate] = useState(getUpcomingDates()[0]);
  const upcomingDates = getUpcomingDates();

  // Fetch matching markets by sport and date
  const { data: marketsData, isLoading } = useQuery<MatchingMarketsResponse>({
    queryKey: ["matchingMarkets", selectedSport, selectedDate],
    queryFn: async () => {
      const response = await fetch(`/api/matching-markets-sport?sport=${selectedSport}&date=${selectedDate}`);
      if (!response.ok) {
        throw new Error("Failed to fetch matching markets");
      }
      return response.json();
    },
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  const markets = marketsData?.markets || {};

  const getKalshiUrl = (eventTicker: string, marketTicker?: string) => {
    if (marketTicker) {
      return `https://kalshi.com/trade/${marketTicker}`;
    }
    return `https://kalshi.com/events/${eventTicker}`;
  };

  const getPolymarketUrl = (marketSlug: string) => {
    return `https://polymarket.com/event/${marketSlug}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="backdrop-blur-xl bg-white/5 dark:bg-black/5 border border-border rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Sport Selection */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground whitespace-nowrap">Sport:</label>
            <select
              value={selectedSport}
              onChange={(e) => setSelectedSport(e.target.value)}
              className="px-3 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            >
              {SPORTS.map((sport) => (
                <option key={sport.value} value={sport.value}>
                  {sport.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Selection */}
          <div className="flex items-center gap-2 flex-1">
            <label className="text-sm text-muted-foreground whitespace-nowrap">Date:</label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm flex-1"
            >
              {upcomingDates.map((date) => (
                <option key={date} value={date}>
                  {formatDate(date)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Markets List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : Object.keys(markets).length === 0 ? (
        <div className="backdrop-blur-xl bg-white/5 dark:bg-black/5 border border-border rounded-2xl p-12 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Markets Found</h3>
          <p className="text-sm text-muted-foreground">
            No matching markets found for {selectedSport.toUpperCase()} on {formatDate(selectedDate)}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(markets).map(([slug, marketList]) => {
            const polymarketMarket = marketList.find((m) => m.platform === "POLYMARKET");
            const kalshiMarket = marketList.find((m) => m.platform === "KALSHI");
            const hasBoth = polymarketMarket && kalshiMarket;

            return (
              <div
                key={slug}
                className="backdrop-blur-xl bg-white/5 dark:bg-black/5 border border-border rounded-2xl p-4 hover:border-primary/50 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{slug}</h4>
                  </div>
                  {hasBoth && (
                    <span className="px-2 py-1 rounded bg-green-500/20 text-green-500 text-xs font-medium whitespace-nowrap ml-2">
                      Arbitrage
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Polymarket */}
                  {polymarketMarket && (
                    <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-500">
                          POLYMARKET
                        </span>
                      </div>
                      <p className="text-xs font-mono text-muted-foreground truncate mb-3">
                        {polymarketMarket.market_slug}
                      </p>
                      {polymarketMarket.market_slug && (
                        <a
                          href={getPolymarketUrl(polymarketMarket.market_slug)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-all text-center flex items-center justify-center gap-1"
                        >
                          Trade on Polymarket
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Kalshi */}
                  {kalshiMarket && (
                    <div className="p-3 rounded-lg border border-green-500/20 bg-green-500/5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-500">
                          KALSHI
                        </span>
                      </div>
                      <p className="text-xs font-mono text-muted-foreground truncate mb-3">
                        {kalshiMarket.event_ticker}
                      </p>
                      {kalshiMarket.event_ticker && (
                        <a
                          href={getKalshiUrl(kalshiMarket.event_ticker)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-all text-center flex items-center justify-center gap-1"
                        >
                          Trade on Kalshi
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useSafeWalletStatus, useDeploySafe } from "@/lib/hooks/useSafeWallet";
import { useTradeClient } from "@/lib/hooks/useTradeClient";
import { useVault } from "@/lib/hooks/useVault";
import { formatAddress, formatCurrency } from "@/lib/utils";
import {
  ArrowLeft,
  Wallet,
  TrendingUp,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

interface Market {
  id: string;
  slug: string;
  question: string;
  outcomes: string[];
  conditionId: string;
  clobTokenIds?: {
    [key: string]: string;
  };
  [key: string]: any;
}

export default function DemoTradingPage() {
  const { address, isConnected } = useAccount();
  const { data: safeStatus, isLoading: checkingSafe, refetch: refetchSafe } = useSafeWalletStatus();
  const deploySafe = useDeploySafe();
  const tradeClient = useTradeClient();
  const { data: vaultInfo } = useVault();

  const [step, setStep] = useState<"setup" | "trade">("setup");
  const [tradeSize, setTradeSize] = useState("");
  const [selectedOutcome, setSelectedOutcome] = useState<string>("");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // Fetch demo market
  const { data: marketData, isLoading: loadingMarket } = useQuery<{ market: Market }>({
    queryKey: ["demoMarket"],
    queryFn: async () => {
      const response = await fetch("/api/markets/demo");
      if (!response.ok) throw new Error("Failed to fetch market");
      return response.json();
    },
    refetchInterval: 30000,
  });

  const market = marketData?.market;

  // Debug: Log market data to console
  useEffect(() => {
    if (market) {
      console.log("Market data:", market);
      console.log("clobTokenIds:", market.clobTokenIds);
      console.log("tokens:", market.tokens);
      console.log("outcomes:", market.outcomes);
    }
  }, [market]);

  // Normalize outcomes to always be an array
  const normalizeOutcomes = (outcomes: any): string[] => {
    if (!outcomes) return ["Yes", "No"];
    if (Array.isArray(outcomes)) return outcomes;
    if (typeof outcomes === "object") return Object.keys(outcomes);
    return ["Yes", "No"];
  };
  
  const outcomes = normalizeOutcomes(market?.outcomes);

  // Extract token IDs from market data
  // Market data can have token IDs in different formats:
  // 1. clobTokenIds object: { "Yes": "tokenId1", "No": "tokenId2" }
  // 2. tokens array: [{ outcome: "Yes", tokenId: "..." }, ...]
  // 3. markets array (if event): markets[0].tokens or markets[0].clobTokenIds
  const getTokenIds = (market: Market | undefined): { [key: string]: string } => {
    if (!market) return {};
    
    // Try clobTokenIds first
    if (market.clobTokenIds && typeof market.clobTokenIds === "object") {
      return market.clobTokenIds;
    }
    
    // Try tokens array
    if (market.tokens && Array.isArray(market.tokens)) {
      const tokenMap: { [key: string]: string } = {};
      market.tokens.forEach((token: any) => {
        if (token.outcome && token.tokenId) {
          tokenMap[token.outcome] = token.tokenId;
        }
      });
      if (Object.keys(tokenMap).length > 0) return tokenMap;
    }
    
    // Try markets array (if this is an event with markets)
    if (market.markets && Array.isArray(market.markets) && market.markets.length > 0) {
      const firstMarket = market.markets[0];
      if (firstMarket.clobTokenIds) return firstMarket.clobTokenIds;
      if (firstMarket.tokens && Array.isArray(firstMarket.tokens)) {
        const tokenMap: { [key: string]: string } = {};
        firstMarket.tokens.forEach((token: any) => {
          if (token.outcome && token.tokenId) {
            tokenMap[token.outcome] = token.tokenId;
          }
        });
        if (Object.keys(tokenMap).length > 0) return tokenMap;
      }
    }
    
    return {};
  };

  const outcomeTokenIds = getTokenIds(market);
  
  // Map Yes/No to actual token IDs
  // Handle case-insensitive matching and common variations
  const getTokenIdForOutcome = (outcome: string): string | null => {
    if (!outcome || !outcomeTokenIds) return null;
    
    // Direct match
    if (outcomeTokenIds[outcome]) return outcomeTokenIds[outcome];
    
    // Case-insensitive match
    const lowerOutcome = outcome.toLowerCase();
    for (const key in outcomeTokenIds) {
      if (key.toLowerCase() === lowerOutcome) {
        return outcomeTokenIds[key];
      }
    }
    
    // Map common variations
    if (lowerOutcome === "yes") {
      // Try to find Yes token
      for (const key in outcomeTokenIds) {
        if (key.toLowerCase().includes("yes") || key.toLowerCase() === "y") {
          return outcomeTokenIds[key];
        }
      }
    }
    
    if (lowerOutcome === "no") {
      // Try to find No token
      for (const key in outcomeTokenIds) {
        if (key.toLowerCase().includes("no") || key.toLowerCase() === "n") {
          return outcomeTokenIds[key];
        }
      }
    }
    
    // If we have exactly 2 tokens, map Yes to first, No to second
    const tokenKeys = Object.keys(outcomeTokenIds);
    if (tokenKeys.length === 2) {
      if (lowerOutcome === "yes") return outcomeTokenIds[tokenKeys[0]];
      if (lowerOutcome === "no") return outcomeTokenIds[tokenKeys[1]];
    }
    
    return null;
  };

  useEffect(() => {
    if (safeStatus?.exists && safeStatus?.isSafe) {
      setStep("trade");
    }
  }, [safeStatus]);

  const handleDeploySafe = async () => {
    try {
      if (!address) {
        alert("Please connect your wallet");
        return;
      }

      // Deploy Safe using wallet signing (production-ready, no private key needed)
      const result = await deploySafe.mutateAsync();
      if (result.safeAddress) {
        alert(`Safe wallet deployed!\nAddress: ${result.safeAddress}\nTransaction: ${result.transactionHash}`);
        refetchSafe();
        setStep("trade");
      }
    } catch (error) {
      console.error("Failed to deploy Safe:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      alert(`Failed to deploy Safe: ${errorMessage}`);
    }
  };

  const handleBuy = async () => {
    if (!selectedOutcome || !tradeSize || !market) {
      alert("Please select outcome and enter trade size");
      return;
    }

    if (!address) {
      alert("Please connect your wallet");
      return;
    }

    const tokenId = getTokenIdForOutcome(selectedOutcome);
    if (!tokenId) {
      console.error("Token IDs available:", outcomeTokenIds);
      console.error("Selected outcome:", selectedOutcome);
      alert(`Token ID not found for selected outcome "${selectedOutcome}". Available tokens: ${Object.keys(outcomeTokenIds).join(", ")}`);
      return;
    }

    setIsPlacingOrder(true);

    try {
      // Get vault private key
      if (!vaultInfo) {
        throw new Error("No vault found. Please create a vault first.");
      }

      // Vault info is already available
      // The vault private key is stored server-side and used for trading
      // Get Safe address for the vault
      const safeAddressResponse = await fetch(`/api/vault/safe-address?userAddress=${address}`);
      if (!safeAddressResponse.ok) {
        throw new Error("Failed to get Safe address");
      }
      const safeInfo = await safeAddressResponse.json();

      // Use vault-based trading with Supabase private key
      // Note: vaultPrivateKey is handled server-side via API
      const result = await tradeClient.mutateAsync({
        tokenId,
        side: "BUY",
        size: tradeSize,
        price: "0.5", // Demo: buy at 50 cents
        safeAddress: safeInfo.safeAddress,
        vaultPrivateKey: "", // Will be fetched server-side from vault
      });

      if (result.success) {
        alert(`Order placed successfully!\nOrder ID: ${result.orderId}`);
        setTradeSize("");
      } else {
        throw new Error("Failed to place order");
      }
    } catch (error) {
      console.error("Failed to place order:", error);
      alert(`Failed to place order: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Wallet Not Connected</h2>
              <p className="text-muted-foreground">Please connect your wallet to start trading</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-4xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <h1 className="text-4xl font-bold mb-2">Demo Trading</h1>
        <p className="text-muted-foreground mb-8">
          Deploy Safe and buy shares gaslessly using the relayer
        </p>

        {/* Market Preview - Always Visible */}
        {loadingMarket ? (
          <div className="flex items-center justify-center py-8 mb-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading market...</span>
          </div>
        ) : market ? (
          <>
            <div className="backdrop-blur-xl bg-white/5 dark:bg-black/5 border border-border rounded-2xl p-6 mb-8">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-2">{market.question}</h2>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {outcomes.map((outcome) => (
                      <span
                        key={outcome}
                        className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium"
                      >
                        {outcome}
                      </span>
                    ))}
                  </div>
                </div>
                <a
                  href={`https://polymarket.com/market/${market.slug || market.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-4 text-primary hover:underline flex items-center gap-1 text-sm"
                >
                  View on Polymarket
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Debug: Raw Market Data */}
            <div className="backdrop-blur-xl bg-white/5 dark:bg-black/5 border border-border rounded-2xl p-6 mb-8">
              <h3 className="text-lg font-semibold mb-4">Debug: Raw Market Data</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2 text-muted-foreground">Extracted Token IDs:</h4>
                  <pre className="bg-background/50 p-3 rounded-lg text-xs overflow-auto max-h-32">
                    {JSON.stringify(outcomeTokenIds, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2 text-muted-foreground">Market clobTokenIds:</h4>
                  <pre className="bg-background/50 p-3 rounded-lg text-xs overflow-auto max-h-32">
                    {JSON.stringify(market.clobTokenIds, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2 text-muted-foreground">Market tokens array:</h4>
                  <pre className="bg-background/50 p-3 rounded-lg text-xs overflow-auto max-h-32">
                    {JSON.stringify(market.tokens, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2 text-muted-foreground">Market outcomes:</h4>
                  <pre className="bg-background/50 p-3 rounded-lg text-xs overflow-auto max-h-32">
                    {JSON.stringify(market.outcomes, null, 2)}
                  </pre>
                </div>
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                    Full Market Object (click to expand)
                  </summary>
                  <pre className="bg-background/50 p-3 rounded-lg text-xs overflow-auto max-h-96 mt-2">
                    {JSON.stringify(market, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          </>
        ) : (
          <div className="backdrop-blur-xl bg-white/5 dark:bg-black/5 border border-border rounded-2xl p-6 mb-8">
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>Failed to load market. Please refresh the page.</p>
            </div>
          </div>
        )}

        {/* Step Indicator */}
        <div className="flex items-center gap-4 mb-8">
          {[
            { id: "setup", label: "1. Setup Safe", icon: Wallet },
            { id: "trade", label: "2. Trade", icon: TrendingUp },
          ].map((s, idx) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isCompleted =
              (s.id === "setup" && safeStatus?.exists) ||
              (s.id === "trade" && step === "trade");

            return (
              <div key={s.id} className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                    isActive || isCompleted
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{s.label}</span>
                </div>
                {idx < 1 && (
                  <div
                    className={`h-0.5 w-8 ${
                      isCompleted ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step 1: Setup Safe */}
        {step === "setup" && (
          <div className="backdrop-blur-xl bg-white/5 dark:bg-black/5 border border-border rounded-2xl p-6">
            <h2 className="text-2xl font-semibold mb-4">Step 1: Deploy Safe Wallet</h2>

            {checkingSafe ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Checking Safe wallet...</span>
              </div>
            ) : safeStatus?.exists && safeStatus?.isSafe ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-500">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Safe wallet already deployed!</span>
                </div>
                <div className="backdrop-blur-md bg-white/5 dark:bg-black/5 rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">Safe Address</div>
                  <div className="font-mono text-sm">{formatAddress(safeStatus.address)}</div>
                </div>
                <button
                  onClick={() => setStep("trade")}
                  className="w-full px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all"
                >
                  Continue to Trade
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Deploy a Safe wallet to enable gasless trading. The deployment is free and
                  gasless via Polymarket relayer.
                </p>
                <button
                  onClick={handleDeploySafe}
                  disabled={deploySafe.isPending}
                  className="w-full px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {deploySafe.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Deploying Safe...
                    </>
                  ) : (
                    <>
                      <Wallet className="h-4 w-4" />
                      Deploy Safe Wallet (Gasless)
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Trade */}
        {step === "trade" && (
          <div className="space-y-6">
            <div className="backdrop-blur-xl bg-white/5 dark:bg-black/5 border border-border rounded-2xl p-6">
              <h2 className="text-2xl font-semibold mb-4">Step 2: Place Trade</h2>

              {!market ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>Market not available. Please refresh the page.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Select Outcome</label>
                    <div className="grid grid-cols-2 gap-2">
                      {outcomes.map((outcome) => {
                        const tokenId = getTokenIdForOutcome(outcome);
                        const hasTokenId = !!tokenId;
                        return (
                          <button
                            key={outcome}
                            onClick={() => setSelectedOutcome(outcome)}
                            disabled={!hasTokenId}
                            className={`px-4 py-3 rounded-lg border transition-all ${
                              selectedOutcome === outcome
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background border-border hover:bg-white/5 dark:hover:bg-black/5"
                            } ${!hasTokenId ? "opacity-50 cursor-not-allowed" : ""}`}
                            title={!hasTokenId ? "Token ID not available" : undefined}
                          >
                            <div className="font-medium">{outcome}</div>
                            {hasTokenId && (
                              <div className="text-xs mt-1 opacity-70 font-mono">
                                {tokenId?.slice(0, 10)}...
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {Object.keys(outcomeTokenIds).length === 0 && (
                      <div className="mt-2 text-xs text-yellow-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Token IDs not found in market data. Debug info logged to console.
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Trade Size (shares)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={tradeSize}
                      onChange={(e) => setTradeSize(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-lg bg-background border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="backdrop-blur-md bg-white/5 dark:bg-black/5 rounded-lg p-4">
                    <div className="text-sm text-muted-foreground mb-1">Estimated Cost</div>
                    <div className="text-lg font-semibold">
                      {tradeSize && parseFloat(tradeSize) > 0
                        ? formatCurrency(parseFloat(tradeSize) * 0.5)
                        : "$0.00"}{" "}
                      <span className="text-sm text-muted-foreground">(at $0.50 per share)</span>
                    </div>
                  </div>

                  <button
                    onClick={handleBuy}
                    disabled={isPlacingOrder || !selectedOutcome || !tradeSize}
                    className="w-full px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isPlacingOrder ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Placing Order...
                      </>
                    ) : (
                      <>
                        <TrendingUp className="h-4 w-4" />
                        Buy Shares (Gasless via Relayer)
                      </>
                    )}
                  </button>

                  {safeStatus?.address && (
                    <div className="text-xs text-muted-foreground text-center">
                      Trading via Safe wallet: {formatAddress(safeStatus.address)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


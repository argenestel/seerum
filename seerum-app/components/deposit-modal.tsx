"use client";

import { useState, useMemo } from "react";
import { useAccount } from "wagmi";
import { useSupportedAssets, useDepositAddresses, type SupportedAsset } from "@/lib/hooks/usePolymarketBridge";
import {
  X,
  Loader2,
  Copy,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Wallet,
  AlertCircle,
  Search,
  ArrowLeft,
} from "lucide-react";
import { formatAddress } from "@/lib/utils";

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetAddress?: string;
}

// Chain ID to display name mapping
const CHAIN_DISPLAY_NAMES: Record<string, string> = {
  "1": "Ethereum",
  "10": "OP Mainnet",
  "56": "BNB Smart Chain",
  "137": "Polygon",
  "42161": "Arbitrum",
  "8453": "Base",
  "999": "HyperEVM",
  "2741": "Abstract",
  "8253038": "Bitcoin",
  "1151111081099710": "Solana",
};

// Map chain IDs to address types
const getAddressType = (chainId: string): "evm" | "svm" | "btc" | null => {
  if (chainId === "1151111081099710") return "svm"; // Solana
  if (chainId === "8253038") return "btc"; // Bitcoin
  return "evm"; // All other chains are EVM
};

// Common token symbols to prioritize in display
const PRIORITY_TOKENS = ["USDC", "USDT", "DAI", "ETH", "BTC", "WETH", "POL", "MATIC", "OP", "ARB", "BNB", "SOL"];

export function DepositModal({ isOpen, onClose, targetAddress }: DepositModalProps) {
  const { address: connectedAddress } = useAccount();
  const address = targetAddress || connectedAddress;
  
  const { data: supportedAssets, isLoading: loadingAssets, error: assetsError } = useSupportedAssets();
  const { data: depositAddressesData, isLoading: loadingAddresses } = useDepositAddresses(address);
  
  const [selectedChainId, setSelectedChainId] = useState<string | null>(null);
  const [selectedTokenAddress, setSelectedTokenAddress] = useState<string | null>(null);
  const [expandedChains, setExpandedChains] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  // Group assets by chain
  const assetsByChain = useMemo(() => {
    if (!supportedAssets) return new Map<string, SupportedAsset[]>();
    
    const grouped = new Map<string, SupportedAsset[]>();
    supportedAssets.forEach((asset) => {
      const chainId = asset.chainId;
      if (!grouped.has(chainId)) {
        grouped.set(chainId, []);
      }
      grouped.get(chainId)!.push(asset);
    });

    // Sort tokens within each chain (priority tokens first, then alphabetically)
    grouped.forEach((assets, chainId) => {
      assets.sort((a, b) => {
        const aPriority = PRIORITY_TOKENS.indexOf(a.token.symbol);
        const bPriority = PRIORITY_TOKENS.indexOf(b.token.symbol);
        
        if (aPriority !== -1 && bPriority !== -1) return aPriority - bPriority;
        if (aPriority !== -1) return -1;
        if (bPriority !== -1) return 1;
        return a.token.symbol.localeCompare(b.token.symbol);
      });
    });

    return grouped;
  }, [supportedAssets]);

  // Filter chains and assets based on search
  const filteredChains = useMemo(() => {
    if (!searchQuery) return Array.from(assetsByChain.keys());
    
    const query = searchQuery.toLowerCase();
    return Array.from(assetsByChain.keys()).filter((chainId) => {
      const chainName = CHAIN_DISPLAY_NAMES[chainId] || chainId;
      const assets = assetsByChain.get(chainId) || [];
      
      return (
        chainName.toLowerCase().includes(query) ||
        assets.some(
          (asset) =>
            asset.token.name.toLowerCase().includes(query) ||
            asset.token.symbol.toLowerCase().includes(query)
        )
      );
    });
  }, [assetsByChain, searchQuery]);

  // Get deposit address for selected token
  const depositAddress = useMemo(() => {
    if (!depositAddressesData?.address || !selectedChainId || !selectedTokenAddress) {
      return null;
    }

    const addressType = getAddressType(selectedChainId);
    if (!addressType) return null;

    const address = depositAddressesData.address[addressType];
    if (!address) return null;

    // Find the selected asset to get token info
    const assets = assetsByChain.get(selectedChainId) || [];
    const selectedAsset = assets.find(
      (asset) => asset.token.address === selectedTokenAddress
    );

    if (!selectedAsset) return null;

    return {
      address,
      chainId: selectedChainId,
      chainName: selectedAsset.chainName,
      tokenSymbol: selectedAsset.token.symbol,
      tokenName: selectedAsset.token.name,
      minCheckoutUsd: selectedAsset.minCheckoutUsd,
    };
  }, [depositAddressesData, selectedChainId, selectedTokenAddress, assetsByChain]);

  const toggleChain = (chainId: string) => {
    setExpandedChains((prev) => {
      const next = new Set(prev);
      if (next.has(chainId)) {
        next.delete(chainId);
      } else {
        next.add(chainId);
      }
      return next;
    });
  };

  const handleSelectToken = (asset: SupportedAsset) => {
    setSelectedChainId(asset.chainId);
    setSelectedTokenAddress(asset.token.address);
    setExpandedChains((prev) => new Set(prev).add(asset.chainId));
  };

  const handleCopyAddress = async (addr: string) => {
    try {
      await navigator.clipboard.writeText(addr);
      setCopiedAddress(addr);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (error) {
      console.error("Failed to copy address:", error);
    }
  };

  const getExplorerUrl = (chainId: string, address: string) => {
    if (chainId === "1") return `https://etherscan.io/address/${address}`;
    if (chainId === "10") return `https://optimistic.etherscan.io/address/${address}`;
    if (chainId === "56") return `https://bscscan.com/address/${address}`;
    if (chainId === "137") return `https://polygonscan.com/address/${address}`;
    if (chainId === "42161") return `https://arbiscan.io/address/${address}`;
    if (chainId === "8453") return `https://basescan.org/address/${address}`;
    if (chainId === "1151111081099710") return `https://solscan.io/account/${address}`;
    if (chainId === "8253038") return `https://blockstream.info/address/${address}`;
    return null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-background">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <h1 className="text-lg font-semibold">Deposit</h1>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6 space-y-4">
            {/* Wallet Address Card */}
            {address && (
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Wallet:</p>
                  <p className="font-mono text-xs truncate">{address}</p>
                </div>
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search chains or tokens..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-border text-sm"
              />
            </div>

            {/* Loading State */}
            {loadingAssets && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-3 text-muted-foreground">Loading supported assets...</span>
              </div>
            )}

            {/* Error State */}
            {assetsError && (
              <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                <span>Failed to load supported assets. Please try again later.</span>
              </div>
            )}

            {/* Assets Grid */}
            {!loadingAssets && !assetsError && supportedAssets && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredChains.map((chainId) => {
                  const assets = assetsByChain.get(chainId) || [];
                  const chainName = CHAIN_DISPLAY_NAMES[chainId] || chainId;
                  const isExpanded = expandedChains.has(chainId);
                  const minDeposit = Math.min(...assets.map(a => a.minCheckoutUsd));

                  return (
                    <div
                      key={chainId}
                      className="rounded-lg border border-border bg-card overflow-hidden"
                    >
                      {/* Chain Header */}
                      <button
                        onClick={() => toggleChain(chainId)}
                        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{chainName}</span>
                          <span className="text-xs text-muted-foreground">
                            ({assets.length})
                          </span>
                          <span className="text-xs font-medium text-muted-foreground">
                            • Min ${minDeposit}
                          </span>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>

                      {/* Tokens List */}
                      {isExpanded && (
                        <div className="border-t border-border divide-y divide-border">
                          {assets.map((asset) => {
                            const isTokenSelected =
                              selectedChainId === asset.chainId &&
                              selectedTokenAddress === asset.token.address;

                            return (
                              <button
                                key={`${asset.chainId}-${asset.token.address}`}
                                onClick={() => handleSelectToken(asset)}
                                className={`w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors ${
                                  isTokenSelected ? "bg-muted" : ""
                                }`}
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <span className="text-sm font-medium">{asset.token.symbol}</span>
                                  {isTokenSelected && (
                                    <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                                  )}
                                  <span className="text-xs text-muted-foreground truncate">
                                    {asset.token.name}
                                  </span>
                                </div>
                                <span className="text-xs font-medium text-muted-foreground ml-2">
                                  ${asset.minCheckoutUsd}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Deposit Address Card */}
            {selectedChainId && selectedTokenAddress && (
              <div className="rounded-lg border border-border bg-card p-4">
                {loadingAddresses ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
                  </div>
                ) : depositAddress ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-sm font-medium">Deposit Address</span>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-2">
                        Send {depositAddress.tokenSymbol} on {depositAddress.chainName}
                      </p>
                      <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/30">
                        <code className="flex-1 text-xs break-all font-mono">
                          {depositAddress.address}
                        </code>
                        <button
                          onClick={() => handleCopyAddress(depositAddress.address)}
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                          title="Copy address"
                        >
                          {copiedAddress === depositAddress.address ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-muted/30 p-2.5">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 space-y-1">
                          <p className="text-xs font-medium">Min: ${depositAddress.minCheckoutUsd}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Send {depositAddress.tokenSymbol} on {depositAddress.chainName} only. Assets are automatically bridged to USDC.e on Polygon.
                          </p>
                        </div>
                      </div>
                    </div>

                    {getExplorerUrl(depositAddress.chainId, depositAddress.address) && (
                      <a
                        href={getExplorerUrl(depositAddress.chainId, depositAddress.address)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs hover:underline"
                      >
                        View on Explorer
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-lg border border-border bg-muted/30 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">No deposit address found</span>
                  </div>
                )}
              </div>
            )}

            {/* Instructions */}
            {!selectedChainId && !loadingAssets && (
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-medium mb-1.5">How to deposit</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground">
                      <li>Select a chain and token</li>
                      <li>Copy the deposit address</li>
                      <li>Send tokens from your wallet</li>
                      <li>Assets are automatically bridged to USDC.e</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

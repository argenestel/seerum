"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Moon, Sun, Copy, Zap, Target, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { useTheme } from "./theme-provider";
import { Leaderboard } from "@/components/leaderboard";
import { useAccount } from "wagmi";
import { User } from "lucide-react";
import Link from "next/link";
import { VaultSetupModal } from "@/components/vault-setup-modal";
import { useVault, useSafeAddress } from "@/lib/hooks/useVault";
import { ArbitrageScanner } from "@/components/arbitrage-scanner";

export default function Home() {
  const { theme, setTheme } = useTheme();
  const [tradeMode, setTradeMode] = useState<"copy" | "free">("copy");
  const { isConnected, address } = useAccount();
  const { data: vaultInfo, isLoading: loadingVault } = useVault();
  const { data: safeInfo, isLoading: loadingSafe } = useSafeAddress(vaultInfo?.vaultAddress);
  const [showVaultModal, setShowVaultModal] = useState(false);

  // Show modal when:
  // 1. User connects and has no vault, OR
  // 2. Vault exists but Safe is not deployed
  useEffect(() => {
    if (isConnected && address && !loadingVault && !loadingSafe) {
      if (!vaultInfo) {
        // No vault - show modal
        setShowVaultModal(true);
      } else if (vaultInfo && safeInfo && !safeInfo.isDeployed) {
        // Vault exists but Safe not deployed - show modal
      setShowVaultModal(true);
      } else if (vaultInfo && safeInfo && safeInfo.isDeployed) {
        // Everything is set up - close modal
        setShowVaultModal(false);
      }
    }
  }, [isConnected, address, loadingVault, loadingSafe, vaultInfo, safeInfo]);

  return (
    <div className="min-h-screen bg-background">
      <VaultSetupModal 
        isOpen={showVaultModal} 
        onClose={() => setShowVaultModal(false)} 
      />
      <header className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border-b border-border p-2 sm:p-4">
        <div className="container mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <h1 className="text-lg sm:text-xl font-semibold">Seerum</h1>
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
            {/* Trade Mode Toggle */}
            <div className="flex items-center gap-1 sm:gap-2 backdrop-blur-md bg-white/20 dark:bg-black/20 rounded-full p-1 border border-border">
              <button
                onClick={() => setTradeMode("copy")}
                className={`px-2 sm:px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  tradeMode === "copy"
                    ? "bg-white dark:bg-white/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Copy Trade"
              >
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <Copy className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Copy Trade</span>
                </div>
              </button>
              <button
                onClick={() => setTradeMode("free")}
                className={`px-2 sm:px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  tradeMode === "free"
                    ? "bg-white dark:bg-white/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Free Trade"
              >
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <Zap className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Free Trade</span>
                </div>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Dark Mode Toggle */}
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 rounded-lg backdrop-blur-md bg-white/20 dark:bg-black/20 border border-border hover:bg-white/30 dark:hover:bg-black/30 transition-all"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </button>

              {isConnected && (
                <Link
                  href="/profile"
                  className="p-2 rounded-lg backdrop-blur-md bg-white/20 dark:bg-black/20 border border-border hover:bg-white/30 dark:hover:bg-black/30 transition-all"
                  title="Profile & Settings"
                >
                  <User className="h-5 w-5" />
                </Link>
              )}
              <div className="[&_button]:text-xs sm:[&_button]:text-sm">
                <ConnectButton />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-6">
        {/* Copy Trade on Prediction Markets Banner */}
        <div className="mb-8 backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-border rounded-2xl p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-muted backdrop-blur-md p-4 border border-border">
                <Target className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-1">
                  Copy Trade on Prediction Markets
                </h3>
                <p className="text-sm text-muted-foreground">
                  Follow expert traders and automatically replicate their positions on prediction markets
                </p>
              </div>
            </div>
    
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-3xl font-semibold mb-2">
            {tradeMode === "copy" ? "Top Traders Leaderboard" : "Free Trading"}
          </h2>
          <p className="text-muted-foreground">
            {tradeMode === "copy"
              ? "Follow top traders and copy their strategies"
              : "Trade freely with your own strategies"}
          </p>
        </div>

        {tradeMode === "copy" ? (
          <Leaderboard />
        ) : (
          <ArbitrageScanner />
        )}
      </main>
    </div>
  );
}

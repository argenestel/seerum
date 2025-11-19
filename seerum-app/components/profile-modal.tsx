"use client";

import { X, Wallet, ExternalLink, CheckCircle2, AlertCircle, User, DollarSign } from "lucide-react";
import { useSafeWalletStatus, useDeploySafe } from "@/lib/hooks/useSafeWallet";
import { useAccount } from "wagmi";
import { formatAddress } from "@/lib/utils";
import { useState } from "react";
import Link from "next/link";
import { DepositModal } from "./deposit-modal";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { address, isConnected } = useAccount();
  const { data: safeStatus, isLoading: checkingSafe, refetch } = useSafeWalletStatus();
  const deploySafe = useDeploySafe();
  const [showBridgeDeposit, setShowBridgeDeposit] = useState(false);

  if (!isOpen) return null;

  const formatAddressShort = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleDeploySafe = async () => {
    try {
      const result = await deploySafe.mutateAsync();
      if (result.safeAddress) {
        alert(`Safe wallet deployed successfully!\nAddress: ${result.safeAddress}\nTransaction: ${result.transactionHash}`);
        refetch();
      }
    } catch (error) {
      console.error("Failed to deploy Safe:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      alert(`Failed to deploy Safe wallet: ${errorMessage}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-border rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-2xl font-semibold">Profile & Settings</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 dark:hover:bg-black/10 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* View Full Profile Link */}
          {isConnected && address && (
            <Link
              href="/profile"
              onClick={onClose}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all w-full justify-center"
            >
              <User className="h-4 w-4" />
              View Full Profile
            </Link>
          )}

          {/* Wallet Info */}
          <div className="backdrop-blur-md bg-white/5 dark:bg-black/5 rounded-lg p-4 border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Wallet className="h-5 w-5" />
              <h3 className="font-semibold text-lg">Connected Wallet</h3>
            </div>
            {isConnected && address ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Address</span>
                  <span className="font-mono text-sm">{formatAddressShort(address)}</span>
                </div>
                <a
                  href={`https://polygonscan.com/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  View on PolygonScan
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No wallet connected</p>
            )}
          </div>

          {/* Safe Wallet Status */}
          <div className="backdrop-blur-md bg-white/5 dark:bg-black/5 rounded-lg p-4 border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Wallet className="h-5 w-5" />
              <h3 className="font-semibold text-lg">Polymarket Safe Wallet</h3>
            </div>

            {checkingSafe ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Checking Safe wallet...</span>
              </div>
            ) : safeStatus?.exists && safeStatus?.isSafe ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Safe wallet connected</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Safe Address</span>
                    <span className="font-mono text-sm break-all text-right ml-4">
                      {formatAddressShort(safeStatus.address)}
                    </span>
                  </div>
                  <a
                    href={`https://polymarket.com/profile/${safeStatus.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    View on Polymarket
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">No Safe wallet found</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  You need a Polymarket account to start trading. Create one on Polymarket to get started with gasless transactions.
                </p>
                <a
                  href="https://polymarket.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all w-full justify-center"
                >
                  Create Polymarket Account
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            )}

            {/* Deposit Section - Only show if Safe exists */}
            {safeStatus?.exists && safeStatus?.isSafe && (
              <div className="mt-4 pt-4 border-t border-border space-y-3">
                <h4 className="font-medium mb-3">Deposit Funds</h4>
                
                <button
                  onClick={() => setShowBridgeDeposit(true)}
                  className="w-full px-4 py-3 rounded-lg border border-border hover:bg-muted transition-all flex items-center justify-center gap-2"
                >
                  <DollarSign className="h-4 w-4" />
                  Deposit Funds
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bridge Deposit Modal */}
      <DepositModal
        isOpen={showBridgeDeposit}
        onClose={() => setShowBridgeDeposit(false)}
        targetAddress={safeStatus?.address}
      />
    </div>
  );
}


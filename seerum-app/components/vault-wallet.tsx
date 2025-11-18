"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { 
  useCreateVault, 
  useVault, 
  useSafeAddress, 
  useDeploySafeFromVault,
  usePolymarketInfo 
} from "@/lib/hooks/useVault";
import { formatAddress } from "@/lib/utils";
import {
  Wallet,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Lock,
  Key,
  Copy,
  Shield,
  ExternalLink,
} from "lucide-react";
import { useCopySubscriptions } from "@/lib/hooks/useCopyTrade";

export function VaultWallet() {
  const { address } = useAccount();
  const createVault = useCreateVault();
  const { data: vaultInfo, refetch: refetchVault } = useVault();
  const { data: safeInfo, refetch: refetchSafe } = useSafeAddress(vaultInfo?.vaultAddress);
  const deploySafe = useDeploySafeFromVault();
  const { data: polymarketInfo, refetch: refetchPolymarket } = usePolymarketInfo(
    safeInfo?.safeAddress
  );
  const { data: subscriptions } = useCopySubscriptions();
  
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (createVault.isSuccess) {
      refetchVault();
    }
  }, [createVault.isSuccess, refetchVault]);

  useEffect(() => {
    if (vaultInfo?.vaultAddress) {
      refetchSafe();
    }
  }, [vaultInfo?.vaultAddress, refetchSafe]);

  useEffect(() => {
    if (safeInfo?.safeAddress) {
      refetchPolymarket();
    }
  }, [safeInfo?.safeAddress, refetchPolymarket]);

  const handleCreateVault = async () => {
    try {
      setError(null);
      await createVault.mutateAsync();
      await refetchVault();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create vault");
    }
  };

  const handleDeploySafe = async () => {
    if (!vaultInfo) return;

    try {
      setError(null);
      await deploySafe.mutateAsync(vaultInfo.id);
      await refetchSafe();
      await refetchPolymarket();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deploy Safe");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!address) {
    return null;
  }

  return (
    <div className="backdrop-blur-xl bg-white/5 dark:bg-black/5 border border-border rounded-2xl p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="rounded-full bg-primary/10 p-2">
          <Lock className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-semibold">Vault Wallet</h3>
          <p className="text-sm text-muted-foreground">
            Encrypted wallet for copy trading
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      {!vaultInfo ? (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-2">
                  Create a secure vault wallet for copy trading. Your private key
                  will be encrypted and stored securely. Only you can decrypt it
                  using your wallet signature.
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Private key encrypted with your signature</li>
                  <li>Only you can decrypt and access funds</li>
                  <li>Used automatically for copy trading</li>
                </ul>
              </div>
            </div>
          </div>

          <button
            onClick={handleCreateVault}
            disabled={createVault.isPending}
            className="w-full px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {createVault.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating Vault...
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4" />
                Create Vault Wallet
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="font-medium text-green-500">Vault Created</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Vault Address:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono">{formatAddress(vaultInfo.vaultAddress)}</span>
                  <button
                    onClick={() => copyToClipboard(vaultInfo.vaultAddress)}
                    className="p-1 hover:bg-white/10 rounded"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>
              {safeInfo && (
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Safe Address:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{formatAddress(safeInfo.safeAddress)}</span>
                    <button
                      onClick={() => copyToClipboard(safeInfo.safeAddress)}
                      className="p-1 hover:bg-white/10 rounded"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}
              {safeInfo && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-muted-foreground">Status:</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    safeInfo.isDeployed 
                      ? "bg-green-500/20 text-green-500" 
                      : "bg-yellow-500/20 text-yellow-500"
                  }`}>
                    {safeInfo.isDeployed ? "Deployed" : "Not Deployed"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Polymarket Info Section */}
          {safeInfo && polymarketInfo && (
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Wallet className="h-4 w-4 text-blue-500" />
                <span className="font-medium text-blue-500">Polymarket Info</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">On-Chain Balance:</span>
                  <span className="font-mono">${parseFloat(polymarketInfo.onChainBalance).toFixed(2)} USDC</span>
                </div>
                {polymarketInfo.polymarketBalance !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Polymarket Balance:</span>
                    <span className="font-mono">${polymarketInfo.polymarketBalance} USDC</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <span className="text-muted-foreground">Deposit Address:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">{formatAddress(polymarketInfo.depositAddress)}</span>
                    <a
                      href={`https://polygonscan.com/address/${polymarketInfo.depositAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 hover:bg-white/10 rounded"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Deploy Safe Button */}
          {safeInfo && !safeInfo.isDeployed && (
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
                  <Shield className="h-4 w-4" />
                  Deploy Safe Wallet (Gasless)
                </>
              )}
            </button>
          )}

          {subscriptions && subscriptions.subscriptions.length > 0 && (
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-sm text-blue-500">
                This vault will be used for copy trading. When traders you follow
                make trades, they will be executed using this vault wallet.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


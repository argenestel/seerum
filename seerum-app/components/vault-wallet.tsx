"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { 
  useCreateVault, 
  useVault, 
  useSafeAddress, 
  useDeploySafeFromVault,
  usePolymarketInfo,
  useGetVaultPrivateKey
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
  DollarSign,
  Info,
  X,
  ArrowRightLeft,
} from "lucide-react";
import { useCopySubscriptions } from "@/lib/hooks/useCopyTrade";
import { DepositModal } from "./deposit-modal";

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
  const [showBridgeDeposit, setShowBridgeDeposit] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [privateKeyCopied, setPrivateKeyCopied] = useState(false);
  const getPrivateKey = useGetVaultPrivateKey();

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

  const handleGetPrivateKey = async () => {
    if (!vaultInfo?.id) return;

    try {
      setError(null);
      const result = await getPrivateKey.mutateAsync(vaultInfo.id);
      setPrivateKey(result.privateKey);
      setShowImportModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get private key");
    }
  };

  const copyPrivateKey = () => {
    if (privateKey) {
      navigator.clipboard.writeText(privateKey);
      setPrivateKeyCopied(true);
      setTimeout(() => setPrivateKeyCopied(false), 2000);
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
        <div className="rounded-full bg-muted/50 p-2">
          <Lock className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-xl font-semibold">Vault Wallet</h3>
          <p className="text-sm text-muted-foreground">
            Encrypted wallet for copy trading
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-muted/50 border border-border text-sm">
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
          {/* Vault Status */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Vault Created</span>
            </div>
            <div className="text-sm">
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
            </div>
          </div>

          {/* Safe Status - Only show if deployed */}
          {safeInfo?.isDeployed && safeInfo?.safeAddress && (
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-5 w-5" />
                <span className="font-medium">Safe Wallet Deployed</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Safe Address:</span>
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
                {polymarketInfo && (
                  <>
                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <span className="text-muted-foreground">USDC Balance:</span>
                      <span className="font-mono">${parseFloat(polymarketInfo.onChainBalance || "0").toFixed(2)}</span>
                </div>
                {polymarketInfo.polymarketBalance !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Polymarket Balance:</span>
                        <span className="font-mono">${polymarketInfo.polymarketBalance}</span>
                  </div>
                )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Deploy Safe Button - Only show if Safe address exists but not deployed */}
          {safeInfo?.safeAddress && !safeInfo.isDeployed && (
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Safe Wallet Not Deployed</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Deploy your Safe wallet to start copy trading. This is a one-time gasless transaction.
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
                  <Shield className="h-4 w-4" />
                  Deploy Safe Wallet (Gasless)
                </>
              )}
            </button>
            </div>
          )}

          {/* Deposit Section - Only show after Safe is deployed */}
          {safeInfo?.isDeployed && safeInfo?.safeAddress && (
            <>
              <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="h-5 w-5" />
                  <span className="font-medium">Deposit Funds</span>
                </div>
                
                <button
                  onClick={() => setShowBridgeDeposit(true)}
                  className="w-full px-4 py-3 rounded-lg border border-border hover:bg-muted transition-all flex items-center justify-center gap-2"
                >
                  <DollarSign className="h-4 w-4" />
                  Deposit Funds
                </button>
                <p className="text-xs text-muted-foreground text-center">
                  Deposit USDC.e on Polygon network
                </p>
              </div>

              {/* Get Private Key Section - Show after Safe is deployed */}
              {safeInfo?.isDeployed && safeInfo?.safeAddress && (
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <Key className="h-5 w-5" />
                    <span className="font-medium">Vault Private Key</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Get your vault wallet private key to sign in to Polymarket with your Safe wallet ({safeInfo.safeAddress ? formatAddress(safeInfo.safeAddress) : ""}).
                  </p>
                  {polymarketInfo && parseFloat(polymarketInfo.onChainBalance || "0") > 0 && (
                    <div className="mb-3 p-2 rounded bg-muted border border-border">
                      <p className="text-xs">
                        ✓ Deposit confirmed: ${parseFloat(polymarketInfo.onChainBalance || "0").toFixed(2)} USDC
                      </p>
                    </div>
                  )}
                  <button
                    onClick={handleGetPrivateKey}
                    disabled={getPrivateKey.isPending}
                    className="w-full px-4 py-3 rounded-lg border border-border hover:bg-muted transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {getPrivateKey.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Key className="h-4 w-4" />
                        Get Private Key
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}

          {subscriptions && subscriptions.subscriptions.length > 0 && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm">
                This vault will be used for copy trading. When traders you follow
                make trades, they will be executed using this vault wallet.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Bridge Deposit Modal */}
      <DepositModal
        isOpen={showBridgeDeposit}
        onClose={() => setShowBridgeDeposit(false)}
        targetAddress={safeInfo?.safeAddress}
      />

      {/* Private Key Modal */}
      {showImportModal && privateKey && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-background border border-border rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Key className="h-5 w-5" />
                Private Key
              </h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setPrivateKey(null);
                }}
                className="p-1 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-start gap-2">
                  <Info className="h-5 w-5 mt-0.5" />
                  <div className="flex-1 text-sm">
                    <p className="font-medium mb-1">Security Notice</p>
                    <p className="text-muted-foreground">
                      Keep your private key secure and never share it with anyone. Anyone with access to this key can control your vault wallet.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Private Key
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={privateKey}
                    className="flex-1 rounded-lg bg-background border border-border px-4 py-2 font-mono text-sm"
                  />
                  <button
                    onClick={copyPrivateKey}
                    className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-all flex items-center gap-2"
                  >
                    {privateKeyCopied ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowImportModal(false);
                  setPrivateKey(null);
                }}
                className="w-full px-4 py-2 rounded-lg border border-border hover:bg-muted transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


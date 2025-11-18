"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useCreateVault, useDecryptVault, useVaultInfo } from "@/lib/hooks/useVault";
import { formatAddress } from "@/lib/utils";
import {
  Wallet,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Lock,
  Key,
  Copy,
} from "lucide-react";
import { useCopySubscriptions } from "@/lib/hooks/useCopyTrade";

export function VaultWallet() {
  const { address } = useAccount();
  const createVault = useCreateVault();
  const decryptVault = useDecryptVault();
  const { data: vaultData, refetch: refetchVault } = useVaultInfo();
  const { data: subscriptions } = useCopySubscriptions();
  
  const vaultInfo = vaultData?.vault || null;
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (createVault.isSuccess) {
      refetchVault();
    }
  }, [createVault.isSuccess, refetchVault]);

  const handleCreateVault = async () => {
    try {
      setError(null);
      await createVault.mutateAsync();
      await refetchVault();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create vault");
    }
  };

  const handleDecryptVault = async () => {
    if (!vaultInfo) return;

    try {
      setError(null);
      const result = await decryptVault.mutateAsync(vaultInfo.id);
      setPrivateKey(result.privateKey);
      setShowPrivateKey(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to decrypt vault");
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
            </div>
          </div>

          {subscriptions && subscriptions.subscriptions.length > 0 && (
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-sm text-blue-500">
                This vault will be used for copy trading. When traders you follow
                make trades, they will be executed using this vault wallet.
              </p>
            </div>
          )}

          {!showPrivateKey ? (
            <button
              onClick={handleDecryptVault}
              disabled={decryptVault.isPending}
              className="w-full px-4 py-3 rounded-lg bg-muted text-foreground font-medium hover:bg-muted/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {decryptVault.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Accessing...
                </>
              ) : (
                <>
                  <Key className="h-4 w-4" />
                  Show Private Key
                </>
              )}
            </button>
          ) : (
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Private Key:</span>
                <button
                  onClick={() => copyToClipboard(privateKey || "")}
                  className="p-1 hover:bg-white/10 rounded"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
              <div className="font-mono text-xs break-all bg-background/50 p-2 rounded">
                {privateKey}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                ⚠️ Keep this private key secure. Never share it with anyone.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


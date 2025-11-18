"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { 
  useCreateVault, 
  useVault, 
  useSafeAddress, 
  useDeploySafeFromVault,
} from "@/lib/hooks/useVault";
import { useDepositUSDC } from "@/lib/hooks/useSafeWallet";
import { formatAddress } from "@/lib/utils";
import {
  Wallet,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Shield,
  DollarSign,
  X,
  ArrowRight,
} from "lucide-react";

interface VaultSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VaultSetupModal({ isOpen, onClose }: VaultSetupModalProps) {
  const { address } = useAccount();
  const createVault = useCreateVault();
  const { data: vaultInfo, refetch: refetchVault } = useVault();
  const { data: safeInfo, refetch: refetchSafe } = useSafeAddress(vaultInfo?.vaultAddress);
  const deploySafe = useDeploySafeFromVault();
  const depositUSDC = useDepositUSDC();
  
  const [depositAmount, setDepositAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"vault" | "safe" | "deposit">("vault");

  // Determine and set initial step based on current state
  useEffect(() => {
    if (!vaultInfo?.vaultAddress) {
      setStep("vault");
    } else if (vaultInfo.vaultAddress && safeInfo && !safeInfo.isDeployed) {
      setStep("safe");
    } else if (safeInfo?.isDeployed) {
      setStep("deposit");
    }
  }, [vaultInfo?.vaultAddress, safeInfo?.isDeployed]);

  // Auto-advance steps based on state
  useEffect(() => {
    if (vaultInfo?.vaultAddress && step === "vault") {
      setStep("safe");
    }
  }, [vaultInfo?.vaultAddress, step]);

  useEffect(() => {
    if (safeInfo?.isDeployed && step === "safe") {
      setStep("deposit");
    }
  }, [safeInfo?.isDeployed, step]);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deploy Safe");
    }
  };

  const handleDeposit = async () => {
    if (!safeInfo?.safeAddress || !depositAmount) {
      setError("Please enter deposit amount");
      return;
    }

    try {
      setError(null);
      await depositUSDC.mutateAsync({
        safeAddress: safeInfo.safeAddress as `0x${string}`,
        amount: depositAmount,
      });
      setDepositAmount("");
      // Close modal after successful deposit
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deposit USDC");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Setup Your Vault</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === "vault" ? "bg-primary text-primary-foreground" : 
              vaultInfo?.vaultAddress ? "bg-green-600 text-white" : "bg-muted"
            }`}>
              {vaultInfo?.vaultAddress ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <span className="text-sm font-medium">1</span>
              )}
            </div>
            <span className={`text-sm ${step === "vault" ? "font-medium" : ""}`}>Vault</span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === "safe" ? "bg-primary text-primary-foreground" : 
              safeInfo?.isDeployed ? "bg-green-600 text-white" : "bg-muted"
            }`}>
              {safeInfo?.isDeployed ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <span className="text-sm font-medium">2</span>
              )}
            </div>
            <span className={`text-sm ${step === "safe" ? "font-medium" : ""}`}>Safe</span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === "deposit" ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}>
              <span className="text-sm font-medium">3</span>
            </div>
            <span className={`text-sm ${step === "deposit" ? "font-medium" : ""}`}>Deposit</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-sm text-red-500">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Step 1: Create Vault */}
        {step === "vault" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <Wallet className="h-8 w-8 text-primary" />
              <div>
                <h3 className="font-medium mb-1">Create Vault Address</h3>
                <p className="text-sm text-muted-foreground">
                  A secure vault address will be generated for your account
                </p>
              </div>
            </div>
            {vaultInfo?.vaultAddress ? (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Vault Created</span>
                </div>
                <p className="text-sm text-muted-foreground font-mono">
                  {formatAddress(vaultInfo.vaultAddress)}
                </p>
              </div>
            ) : (
              <button
                onClick={handleCreateVault}
                disabled={createVault.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createVault.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Creating Vault...
                  </>
                ) : (
                  <>
                    <Wallet className="h-5 w-5" />
                    Create Vault Address
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Step 2: Deploy Safe */}
        {step === "safe" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <h3 className="font-medium mb-1">Deploy Safe Wallet</h3>
                <p className="text-sm text-muted-foreground">
                  Deploy a Safe wallet for secure trading on Polymarket. This is a one-time gasless transaction.
                </p>
              </div>
            </div>
            {safeInfo?.isDeployed ? (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Safe Deployed</span>
                </div>
                {safeInfo.safeAddress && (
                  <p className="text-sm text-muted-foreground font-mono">
                    {formatAddress(safeInfo.safeAddress)}
                  </p>
                )}
              </div>
            ) : (
              <button
                onClick={handleDeploySafe}
                disabled={deploySafe.isPending || !vaultInfo}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deploySafe.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Deploying Safe...
                  </>
                ) : (
                  <>
                    <Shield className="h-5 w-5" />
                    Deploy Safe Wallet (Gasless)
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Step 3: Deposit */}
        {step === "deposit" && safeInfo?.isDeployed && safeInfo?.safeAddress && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <DollarSign className="h-8 w-8 text-primary" />
              <div>
                <h3 className="font-medium mb-1">Deposit USDC</h3>
                <p className="text-sm text-muted-foreground">
                  Transfer USDC from your connected wallet to your Safe wallet to start trading.
                </p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Amount (USDC)
              </label>
              <input
                type="number"
                step="0.000001"
                min="0"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg bg-background border border-border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Make sure you have USDC in your connected wallet
              </p>
            </div>
            <button
              onClick={handleDeposit}
              disabled={depositUSDC.isPending || !depositAmount}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {depositUSDC.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Depositing...
                </>
              ) : (
                <>
                  <DollarSign className="h-5 w-5" />
                  Deposit USDC
                </>
              )}
            </button>
            <p className="text-xs text-center text-muted-foreground">
              After depositing, you can start copy trading!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


"use client";

import { useSafeWalletStatus, useDeploySafe, useDepositUSDC } from "@/lib/hooks/useSafeWallet";
import { useAccount } from "wagmi";
import { useState } from "react";
import { Wallet, CheckCircle2, Loader2, ArrowRight, DollarSign } from "lucide-react";
import { formatUSDC } from "@/lib/utils/safe-wallet";

export function SafeWalletSetup() {
  const { address, isConnected } = useAccount();
  const { data: safeStatus, isLoading: checkingSafe } = useSafeWalletStatus();
  const deploySafe = useDeploySafe();
  const depositUSDC = useDepositUSDC();
  
  const [depositAmount, setDepositAmount] = useState("");

  const handleDeploySafe = async () => {
    try {
      const result = await deploySafe.mutateAsync();
      console.log("Safe deployed:", result);
      
      if (result.safeAddress) {
        alert(`Safe wallet deployed successfully!\nAddress: ${result.safeAddress}\nTransaction: ${result.transactionHash}`);
      }
      
      // Refetch safe status
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error("Failed to deploy Safe:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      alert(`Failed to deploy Safe wallet: ${errorMessage}\n\nNote: You may need to configure USER_PRIVATE_KEY in your environment variables for server-side operations.`);
    }
  };

  const handleDeposit = async () => {
    if (!safeStatus?.address || !depositAmount) {
      alert("Please enter deposit amount");
      return;
    }

    try {
      const result = await depositUSDC.mutateAsync({
        safeAddress: safeStatus.address,
        amount: depositAmount,
      });
      console.log("Deposit successful:", result);
      setDepositAmount("");
      alert("Deposit successful!");
    } catch (error) {
      console.error("Failed to deposit:", error);
      alert("Failed to deposit USDC. Please check your balance and try again.");
    }
  };

  if (!isConnected) {
    return (
      <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Wallet className="h-6 w-6" />
          <h3 className="text-xl font-semibold">Polymarket Safe Wallet</h3>
        </div>
        <p className="text-muted-foreground mb-4">
          Connect your wallet to create or manage your Polymarket Safe wallet.
        </p>
      </div>
    );
  }

  return (
    <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-border rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <Wallet className="h-6 w-6" />
        <h3 className="text-xl font-semibold">Polymarket Safe Wallet</h3>
      </div>

      {checkingSafe ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Checking Safe wallet...</span>
        </div>
      ) : safeStatus?.exists && safeStatus?.isSafe ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-500">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Safe wallet connected</span>
          </div>
          
          <div className="backdrop-blur-md bg-white/5 dark:bg-black/5 rounded-lg p-4 border border-border">
            <div className="text-xs text-muted-foreground mb-1">Safe Address</div>
            <div className="font-mono text-sm break-all">{safeStatus.address}</div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-2">
                Deposit USDC to Safe Wallet
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.000001"
                  min="0"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 rounded-lg bg-background border border-border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={handleDeposit}
                  disabled={depositUSDC.isPending || !depositAmount}
                  className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {depositUSDC.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Depositing...
                    </>
                  ) : (
                    <>
                      <DollarSign className="h-4 w-4" />
                      Deposit
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-muted-foreground">
            You don't have a Polymarket Safe wallet yet. Create one to start trading on Polymarket.
          </div>

          <button
            onClick={handleDeploySafe}
            disabled={deploySafe.isPending}
            className="w-full px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {deploySafe.isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Deploying Safe Wallet...
              </>
            ) : (
              <>
                Create Safe Wallet
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>

          <div className="text-xs text-muted-foreground">
            This will deploy a Safe wallet that you control. You'll need to sign a message to create it.
          </div>
        </div>
      )}
    </div>
  );
}


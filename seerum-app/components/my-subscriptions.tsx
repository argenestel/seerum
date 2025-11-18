"use client";

import { useCopySubscriptions, useUnsubscribeFromTrader } from "@/lib/hooks/useCopyTrade";
import { formatAddress } from "@/lib/utils";
import {
  CheckCircle2,
  Loader2,
  XCircle,
  ExternalLink,
  Copy,
} from "lucide-react";
import Link from "next/link";

export function CopyTrading() {
  const { data: subscriptions, isLoading } = useCopySubscriptions();
  const unsubscribe = useUnsubscribeFromTrader();

  const handleStopCopying = async (traderAddress: string) => {
    try {
      await unsubscribe.mutateAsync(traderAddress as `0x${string}`);
    } catch (error) {
      console.error("Stop copying error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to stop copying";
      alert(`Failed to stop copying: ${errorMessage}`);
    }
  };

  if (isLoading) {
    return (
      <div className="backdrop-blur-xl bg-white/5 dark:bg-black/5 border border-border rounded-2xl p-6">
        <h2 className="text-2xl font-semibold mb-4">Copy Trading</h2>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading copy trading...</span>
        </div>
      </div>
    );
  }

  if (!subscriptions || subscriptions.subscriptions.length === 0) {
    return (
      <div className="backdrop-blur-xl bg-white/5 dark:bg-black/5 border border-border rounded-2xl p-6">
        <h2 className="text-2xl font-semibold mb-4">Copy Trading</h2>
        <div className="text-center py-8 text-muted-foreground">
          <Copy className="h-8 w-8 mx-auto mb-2" />
          <p>No active copy trading</p>
          <p className="text-sm mt-1">
            Subscribe to traders on the dashboard to start copying their trades
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="backdrop-blur-xl bg-white/5 dark:bg-black/5 border border-border rounded-2xl p-6 mb-8">
      <h2 className="text-2xl font-semibold mb-4">Copy Trading</h2>
      <div className="space-y-3">
        {subscriptions.subscriptions.map((sub) => (
          <div
            key={`${sub.address}-${sub.traderAddress}`}
            className="backdrop-blur-md bg-white/5 dark:bg-black/5 rounded-lg p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium text-sm">Active</span>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">
                  Copying from
                </div>
                <div className="font-mono text-sm">
                  {formatAddress(sub.traderAddress)}
                </div>
              </div>
              <Link
                href={`/trader/${sub.traderAddress}`}
                className="text-primary hover:underline text-sm flex items-center gap-1"
              >
                View Trader
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
            <button
              onClick={() => handleStopCopying(sub.traderAddress)}
              disabled={unsubscribe.isPending}
              className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {unsubscribe.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Stopping...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  Stop Copying
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}


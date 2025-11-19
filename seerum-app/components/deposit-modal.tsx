"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import {
  X,
  Copy,
  CheckCircle2,
  ExternalLink,
  Wallet,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { formatAddress } from "@/lib/utils";

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetAddress?: string;
}

export function DepositModal({ isOpen, onClose, targetAddress }: DepositModalProps) {
  const { address: connectedAddress } = useAccount();
  const safeAddress = targetAddress || connectedAddress;
  
  const [copiedAddress, setCopiedAddress] = useState(false);

  const handleCopyAddress = async () => {
    if (!safeAddress) return;
    try {
      await navigator.clipboard.writeText(safeAddress);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (error) {
      console.error("Failed to copy address:", error);
    }
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
          <div className="max-w-2xl mx-auto p-6 space-y-4">
            {/* Deposit Address Card */}
            {safeAddress && (
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Wallet className="h-4 w-4" />
                  <span className="text-sm font-medium">Safe Wallet Address</span>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/30">
                  <code className="flex-1 text-xs break-all font-mono">
                    {safeAddress}
                  </code>
                  <button
                    onClick={handleCopyAddress}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                    title="Copy address"
                  >
                    {copiedAddress ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                <a
                  href={`https://polygonscan.com/address/${safeAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs hover:underline mt-2"
                >
                  View on PolygonScan
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            {/* Warning Card */}
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 space-y-3">
                  <p className="text-sm font-medium">Important Deposit Instructions</p>
                  <div className="rounded-lg border-2 border-border bg-muted/30 p-3">
                    <p className="text-xs font-semibold mb-1">Deposit Requirements:</p>
                    <div className="space-y-1 text-xs">
                      <p className="font-medium">
                        Token: <span className="font-semibold">USDC.e</span> (USD Coin bridged from Ethereum)
                      </p>
                      <p className="font-medium">
                        Chain: <span className="font-semibold">Polygon</span> network only
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p className="font-medium">Do not send:</p>
                    <ul className="list-disc list-inside space-y-0.5 ml-2">
                      <li>USDC from other chains (Ethereum, Base, Arbitrum, etc.)</li>
                      <li>Other tokens (USDT, DAI, ETH, MATIC, etc.)</li>
                      <li>Sending the wrong token or from the wrong chain may result in loss of funds</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-medium mb-1.5">How to deposit</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground">
                    <li>Copy the Safe wallet address above</li>
                    <li>Open your wallet (MetaMask, etc.)</li>
                    <li>Switch to <span className="font-medium">Polygon</span> network</li>
                    <li>Send <span className="font-medium">USDC.e</span> to the copied address</li>
                    <li>Wait for transaction confirmation</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

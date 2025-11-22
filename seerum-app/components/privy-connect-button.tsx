"use client";

import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useAccount } from 'wagmi';
import { Wallet, LogOut, ChevronDown, Copy, Check, Loader2, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { formatAddress } from '@/lib/utils';

const formatAddressShort = (address: string, length: number = 6) => {
  if (!address) return 'Unknown';
  return `${address.slice(0, length)}...${address.slice(-4)}`;
};

export function PrivyConnectButton() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { address, isConnected, isConnecting } = useAccount();
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);

  const handleConnect = () => {
    login();
  };

  const handleDisconnect = () => {
    logout();
    setShowDropdown(false);
  };

  // Track wallet creation state
  useEffect(() => {
    if (authenticated && !isConnected && walletsReady) {
      // User is authenticated but wallet might be creating
      const hasEmbeddedWallet = wallets.some(w => w.walletClientType === 'privy');
      setIsCreatingWallet(authenticated && !hasEmbeddedWallet && !isConnected);
    } else {
      setIsCreatingWallet(false);
    }
  }, [authenticated, isConnected, wallets, walletsReady]);

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Get wallet type/name
  const getWalletName = () => {
    if (!wallets.length) return 'Wallet';
    const wallet = wallets[0];
    if (wallet.walletClientType === 'privy') {
      return 'Privy Wallet';
    }
    return wallet.walletClientType || 'Wallet';
  };

  // Get login method
  const getLoginMethod = () => {
    if (!user) return null;
    if (user.google) return 'Google';
    if (user.email) return 'Email';
    if (user.phone) return 'SMS';
    if (user.wallet) return 'Wallet';
    return 'Connected';
  };

  if (!ready) {
    return (
      <div className="px-4 py-2 rounded-lg backdrop-blur-md bg-white/20 dark:bg-black/20 border border-border animate-pulse">
        <div className="h-4 w-20 bg-muted rounded"></div>
      </div>
    );
  }

  // Show wallet creation state
  if (isCreatingWallet || (authenticated && !isConnected && walletsReady)) {
    return (
      <div className="px-4 py-2 rounded-lg backdrop-blur-md bg-white/20 dark:bg-black/20 border border-border flex items-center gap-2 font-medium text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="hidden sm:inline">Creating your wallet...</span>
        <span className="sm:hidden">Creating...</span>
      </div>
    );
  }

  // Show connecting state
  if (isConnecting) {
    return (
      <div className="px-4 py-2 rounded-lg backdrop-blur-md bg-white/20 dark:bg-black/20 border border-border flex items-center gap-2 font-medium text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Connecting...</span>
      </div>
    );
  }

  if (!authenticated || !isConnected) {
    return (
      <button
        onClick={handleConnect}
        className="px-4 py-2 rounded-lg backdrop-blur-md bg-white/20 dark:bg-black/20 border border-border hover:bg-white/30 dark:hover:bg-black/30 transition-all flex items-center gap-2 font-medium text-sm group"
      >
        <Sparkles className="h-4 w-4 group-hover:scale-110 transition-transform" />
        <span>Sign In</span>
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="px-4 py-2 rounded-lg backdrop-blur-md bg-white/20 dark:bg-black/20 border border-border hover:bg-white/30 dark:hover:bg-black/30 transition-all flex items-center gap-2 font-medium text-sm"
      >
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500"></div>
          <span className="hidden sm:inline">{address ? formatAddress(address) : 'Unknown'}</span>
          <span className="sm:hidden">{address ? formatAddressShort(address, 4) : 'Unknown'}</span>
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 mt-2 w-64 rounded-lg backdrop-blur-xl bg-white/95 dark:bg-black/95 border border-border shadow-lg z-50 overflow-hidden">
            <div className="p-4 space-y-3">
              {/* Wallet Info */}
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  {getWalletName()}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <span className="text-sm font-mono">{formatAddress(address || '')}</span>
                  </div>
                  <button
                    onClick={copyAddress}
                    className="p-1.5 rounded hover:bg-muted transition-colors"
                    title="Copy address"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Login Method */}
              {getLoginMethod() && (
                <div className="pt-2 border-t border-border">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Signed in with
                  </div>
                  <div className="text-sm font-medium">{getLoginMethod()}</div>
                  {wallets.some(w => w.walletClientType === 'privy') && (
                    <div className="text-xs text-muted-foreground mt-1">
                      ✓ Wallet created automatically
                    </div>
                  )}
                </div>
              )}

              {/* Disconnect Button */}
              <button
                onClick={handleDisconnect}
                className="w-full mt-4 px-4 py-2 rounded-lg border border-border hover:bg-destructive/10 hover:border-destructive transition-all flex items-center justify-center gap-2 text-sm font-medium text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Disconnect
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


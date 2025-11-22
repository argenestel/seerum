"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from '@privy-io/wagmi';
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { polygon } from "wagmi/chains";
import { http } from "wagmi";
import { ThemeProvider, useTheme } from "./theme-provider";
import "@rainbow-me/rainbowkit/styles.css";
import { createConfig } from '@privy-io/wagmi';
import { PrivyProvider } from '@privy-io/react-auth';

import type { PrivyClientConfig } from '@privy-io/react-auth';

function createPrivyConfig(theme: 'light' | 'dark'): PrivyClientConfig {
  return {
    embeddedWallets: {
      ethereum: {
        createOnLogin: 'users-without-wallets' // Automatically create wallet for Google/Email/SMS users
      },
      showWalletUIs: true
    },
    loginMethods: ['google', 'wallet', 'email', 'sms'], // Google first for better UX
    appearance: {
      showWalletLoginFirst: false, // Show social login first (Google)
      walletList: ['metamask', 'rainbow', 'wallet_connect', 'coinbase_wallet'],
      theme: theme,
      accentColor: '#6366f1'
    },
    defaultChain: polygon
  };
}

export const config = createConfig({
  chains: [polygon],
  transports: {
    [polygon.id]: http()
  }
});

const queryClient = new QueryClient();

function PrivyWrapper({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const privyConfig = createPrivyConfig(theme || 'dark');
  
  return (
    <PrivyProvider appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!} config={privyConfig}>
      {children}
    </PrivyProvider>
  );
}

function RainbowKitWrapper({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  
  return (
    <RainbowKitProvider theme={theme === "dark" ? darkTheme() : undefined}>
      {children}
    </RainbowKitProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="dark">
      <PrivyWrapper>
        <QueryClientProvider client={queryClient}>
          <WagmiProvider config={config}>
            <RainbowKitWrapper>{children}</RainbowKitWrapper>
          </WagmiProvider>
        </QueryClientProvider>
      </PrivyWrapper>
    </ThemeProvider>
  );
}


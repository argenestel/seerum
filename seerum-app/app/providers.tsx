"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, getDefaultConfig, darkTheme } from "@rainbow-me/rainbowkit";
import { polygon } from "wagmi/chains";
import { ThemeProvider, useTheme } from "./theme-provider";
import "@rainbow-me/rainbowkit/styles.css";

const config = getDefaultConfig({
  appName: "Seerum App",
  projectId: "YOUR_PROJECT_ID", // Replace with your WalletConnect project ID
  chains: [polygon], // Only Polygon - Polymarket operates on Polygon
  ssr: false, // Disable SSR to prevent localStorage access during build
});

const queryClient = new QueryClient();

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
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitWrapper>{children}</RainbowKitWrapper>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}


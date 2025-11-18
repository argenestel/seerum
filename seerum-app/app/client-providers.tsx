"use client";

import dynamic from "next/dynamic";

// Dynamically import Providers to prevent SSR issues with localStorage
const Providers = dynamic(() => import("./providers").then(mod => ({ default: mod.Providers })), {
  ssr: false,
});

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>;
}


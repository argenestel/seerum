import type { NextConfig } from "next";

const nextConfig: NextConfig = {

  typescript: {
    // TypeScript errors will still block builds
    // Set to true only if you need to deploy with type errors (not recommended)
    ignoreBuildErrors: false,
  },
};

export default nextConfig;

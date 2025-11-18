import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // ESLint will run during builds but warnings won't block deployment
    // Only errors will block deployment
    ignoreDuringBuilds: false,
  },
  typescript: {
    // TypeScript errors will still block builds
    // Set to true only if you need to deploy with type errors (not recommended)
    ignoreBuildErrors: false,
  },
};

export default nextConfig;

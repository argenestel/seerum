import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // TypeScript errors will still block builds
    ignoreBuildErrors: false,
  },
  // Use webpack to avoid bundling test files from node_modules
  // Turbopack (default in Next.js 16) tries to bundle everything including test files
  // which causes build failures when test files import test-only dependencies
  webpack: (config) => {
    const webpack = require('webpack');
    
    // Ignore test files and other non-production files from node_modules
    config.plugins = config.plugins || [];
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/(test|tests|__tests__|bench|benchmark|\.test\.|\.spec\.)/,
        contextRegExp: /node_modules\/thread-stream/,
      })
    );
    
    // Ignore LICENSE and README files
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^(LICENSE|README\.md)$/,
        contextRegExp: /node_modules\/thread-stream/,
      })
    );
    
    return config;
  },
};

export default nextConfig;

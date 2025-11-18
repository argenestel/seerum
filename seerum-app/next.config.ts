import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configure webpack to exclude test files and other non-production files
  // This prevents Turbopack/webpack from trying to bundle test files from node_modules
  webpack: (config, { isServer }) => {
    const webpack = require('webpack');
    
    // Use IgnorePlugin to completely ignore test files and other non-production files
    config.plugins = config.plugins || [];
    
    // Ignore test files in thread-stream package
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/(test|tests|__tests__|bench|benchmark|\.test\.|\.spec\.)/,
        contextRegExp: /node_modules\/thread-stream/,
      })
    );
    
    // Ignore LICENSE and README files in thread-stream
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^(LICENSE|README\.md)$/,
        contextRegExp: /node_modules\/thread-stream/,
      })
    );
    
    // Also ignore test files from other packages that might cause issues
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/(test|tests|__tests__|bench|benchmark|\.test\.|\.spec\.)/,
        contextRegExp: /node_modules/,
      })
    );
    
    return config;
  },
};

export default nextConfig;

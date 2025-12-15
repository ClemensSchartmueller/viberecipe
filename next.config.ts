import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Ensure we don't have issues with strict mode matching dev behavior
  reactStrictMode: true,
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@hull-eats/ui", "@hull-eats/sdk", "@hull-eats/types"],
};

export default nextConfig;

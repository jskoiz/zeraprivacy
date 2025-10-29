import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["ghost-sol", "@noble/curves", "@noble/hashes"],
  serverExternalPackages: [],
};

export default nextConfig;

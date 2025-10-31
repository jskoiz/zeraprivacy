import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["zera", "@noble/curves", "@noble/hashes"],
  serverExternalPackages: [],
};

export default nextConfig;

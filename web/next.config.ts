import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Include the framework-free model used by both frontends.
  turbopack: { root: path.join(__dirname, "..") },
};

export default nextConfig;

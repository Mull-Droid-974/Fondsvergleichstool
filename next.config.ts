import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse"],
  experimental: {
    // Needed for @react-pdf/renderer server-side rendering
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
  },
};

export default nextConfig;

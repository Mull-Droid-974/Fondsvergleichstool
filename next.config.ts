import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["unpdf", "@react-pdf/renderer"],
};

export default nextConfig;

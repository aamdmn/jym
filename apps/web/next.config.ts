import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // skip ts check
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

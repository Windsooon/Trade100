import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Disable ESLint during builds (for deployment)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable type checking during builds (for faster deployment)
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

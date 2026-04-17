import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.cnbeta.com.tw",
      },
      {
        protocol: "https",
        hostname: "**.cnbeta.com",
      },
    ],
  },
};

export default nextConfig;

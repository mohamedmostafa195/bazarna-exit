import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-c1e2cd0f5a51401993056e38c1816f26.r2.dev",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // In local development or if NEXT_PUBLIC_API_URL is configured, proxy /api to FastAPI
    const backendUrl = process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

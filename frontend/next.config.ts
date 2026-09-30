import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Automatically proxy all /api requests to the Express backend (port 5000)
  // This eliminates the need for any .env configuration or CORS configuration on the frontend.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:5000/api/:path*",
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        source: "/r/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, must-revalidate" },
        ],
      },
      {
        source: "/api/retros/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, must-revalidate" },
        ],
      },
      {
        source: "/api/cards/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;

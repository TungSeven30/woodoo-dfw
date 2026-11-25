import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    unoptimized: false,
    qualities: [75, 85, 90],
    // Phone widths at 3x (1170, 1290) and desktop at 2x (2560, 2880) so full-bleed photos stay sharp.
    deviceSizes: [640, 750, 828, 1080, 1170, 1290, 1920, 2560, 2880, 3840],
  },
  compress: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/textures/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/basis/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/env/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/tier-c/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;

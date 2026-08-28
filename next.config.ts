import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
    ],
  },
  // Demo RapidNet (multi-zona): /demo se sirve desde el proyecto Vercel
  // `ecos-demo` (rama demo-rapidnet, datos fantasma, sin login). Esa app usa
  // basePath /demo, por eso el destino conserva el prefijo.
  async rewrites() {
    return [
      {
        source: "/demo",
        destination: "https://ecos-demo-ruby.vercel.app/demo",
      },
      {
        source: "/demo/:path*",
        destination: "https://ecos-demo-ruby.vercel.app/demo/:path*",
      },
    ];
  },
};

export default nextConfig;

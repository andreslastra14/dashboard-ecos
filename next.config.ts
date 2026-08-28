import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Demo RapidNet: vive bajo dashboard.ecos-app.com/demo vía rewrite multi-zona
  // desde la app principal, por eso todos los assets/rutas cuelgan de /demo.
  basePath: "/demo",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
    ],
  },
};

export default nextConfig;

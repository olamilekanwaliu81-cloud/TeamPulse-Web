import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The landing page is a static file made from ../landing/index.html (npm run landing).
  async rewrites() {
    return [{ source: "/", destination: "/landing.html" }];
  },
  poweredByHeader: false,
  // Without this Next.js can pick up a stray package-lock.json from a parent folder.
  turbopack: { root: process.cwd() },
};

export default nextConfig;

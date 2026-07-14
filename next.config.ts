import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The production site uses only the App Router surface. The Cloudflare
  // worker helpers remain available for the separate Sites deployment.
  typescript: {
    tsconfigPath: "tsconfig.vercel.json",
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;

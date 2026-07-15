import type { NextConfig } from "next";

// The site now runs as a Node server (no static export), so it can serve
// route handlers and talk to the local SQLite database.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
  trailingSlash: true,

  // better-sqlite3 is a native module; Next must not try to bundle it.
  serverExternalPackages: ["better-sqlite3"],

  images: {
    loader: "custom",
    loaderFile: "./image-loader.ts",
  },
};

export default nextConfig;

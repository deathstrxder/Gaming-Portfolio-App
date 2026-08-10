import type { NextConfig } from "next";

// The site now runs as a Node server (no static export), so it can serve
// route handlers and talk to the local SQLite database.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),

  images: {
    loader: "custom",
    loaderFile: "./image-loader.ts",

    // Clip thumbnails come from YouTube's CDN. The custom loader above bypasses
    // Next's built-in optimizer, and with it the host allow-list, so this is not
    // load-bearing today — it declares the one remote host the site renders, and
    // keeps images working if the custom loader (written for the retired GitHub
    // Pages export) is ever dropped.
    remotePatterns: [{ protocol: "https", hostname: "i.ytimg.com" }],
  },
};

export default nextConfig;

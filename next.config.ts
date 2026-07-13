import type { NextConfig } from "next";

// GitHub Pages serves this project repo under a sub-path (/Gaming-Portfolio-App).
// The base path is injected at build time (see .github/workflows/deploy.yml) and is
// empty locally, so `npm run dev`/`build` run at the domain root. The same value is
// read by ./image-loader.ts to prefix <Image> URLs.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  // Emit a fully static site into `out/` — no Node server needed to host it.
  output: "export",

  // Only set basePath/assetPrefix when deploying under a sub-path (i.e. in CI).
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),

  // Emit `foo/index.html` and `foo/` links — the tidy shape for static hosts like Pages.
  trailingSlash: true,

  images: {
    // The default image optimizer needs a server, which a static export doesn't have.
    // A custom loader serves assets as-is and adds the basePath (see image-loader.ts).
    loader: "custom",
    loaderFile: "./image-loader.ts",
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Static personal portfolio with trusted local assets (incl. SVG logos/icons).
    // Serving assets as-is avoids the optional `sharp` optimizer and the SVG
    // optimizer restrictions, and keeps the build self-contained.
    unoptimized: true,
  },
};

export default nextConfig;

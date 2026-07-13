/**
 * Custom `next/image` loader for the static export deployed to GitHub Pages.
 *
 * This Next version does NOT automatically prefix an <Image> `src` with `basePath`
 * (per the Next docs: "you will need to add the basePath in front of src"), so we
 * prepend it here — one place that covers every <Image> in the app. It returns the
 * asset URL untouched otherwise (no optimization), which also sidesteps the built-in
 * SVG optimizer restrictions the way `images.unoptimized` used to.
 *
 * The base path is injected at build time via NEXT_PUBLIC_BASE_PATH
 * (see .github/workflows/deploy.yml); it's empty locally, so `npm run dev`/`build`
 * serve assets from the domain root.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function imageLoader({ src }: { src: string; width: number; quality?: number }): string {
  // Leave remote and inline (data:) URLs alone; only prefix local /public assets.
  if (/^https?:\/\//.test(src) || src.startsWith("data:")) return src;
  return `${basePath}${src}`;
}

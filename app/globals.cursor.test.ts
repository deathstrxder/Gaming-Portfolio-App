import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

import { describe, expect, it } from "vitest";

/**
 * The two cursor blades are baked into globals.css as base64 PNGs by an offline
 * pipeline, so nothing in the build can catch it when a re-run changes them.
 * These tests decode the real bytes and assert the two properties the art is
 * supposed to have.
 *
 * The decoder is written out longhand rather than pulled from a package: the
 * only image library in the tree is `sharp`, which arrives transitively via
 * next and is not declared in package.json, so a test importing it would break
 * the day that transitive edge moves. Both cursors are 8-bit RGBA and
 * non-interlaced, which is the one PNG shape this needs to handle.
 */
interface Decoded {
  width: number;
  height: number;
  data: Buffer;
}

function decodePng(buf: Buffer): Decoded {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("not a PNG");

  let width = 0;
  let height = 0;
  const idat: Buffer[] = [];

  for (let offset = 8; offset < buf.length; ) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString("ascii", offset + 4, offset + 8);
    const body = buf.subarray(offset + 8, offset + 8 + length);

    if (type === "IHDR") {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      const [depth, colorType, interlace] = [body[8], body[9], body[12]];
      if (depth !== 8 || colorType !== 6 || interlace !== 0) {
        throw new Error(`unsupported PNG: depth=${depth} colorType=${colorType} interlace=${interlace}`);
      }
    } else if (type === "IDAT") {
      idat.push(Buffer.from(body));
    } else if (type === "IEND") {
      break;
    }
    offset += 12 + length;
  }

  const raw = inflateSync(Buffer.concat(idat));
  const bpp = 4;
  const stride = width * bpp;
  const out = Buffer.alloc(height * stride);

  // Undo the per-scanline filters. Each row is prefixed with its filter type.
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));

    for (let x = 0; x < stride; x += 1) {
      const left = x >= bpp ? out[y * stride + x - bpp] : 0;
      const up = y > 0 ? out[(y - 1) * stride + x] : 0;
      const upLeft = x >= bpp && y > 0 ? out[(y - 1) * stride + x - bpp] : 0;
      let value = line[x];

      if (filter === 1) value += left;
      else if (filter === 2) value += up;
      else if (filter === 3) value += (left + up) >> 1;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        value += pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
      } else if (filter !== 0) {
        throw new Error(`unknown PNG filter ${filter}`);
      }

      out[y * stride + x] = value & 0xff;
    }
  }

  return { width, height, data: out };
}

function cursorFromCss(name: string): Decoded {
  const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");
  const match = css.match(new RegExp(`--${name}:\\s*url\\("data:image/png;base64,([A-Za-z0-9+/=]+)"\\)`));
  if (!match) throw new Error(`--${name} not found in globals.css`);
  return decodePng(Buffer.from(match[1], "base64"));
}

const luminance = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

function saturation(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  return max === 0 ? 0 : (max - Math.min(r, g, b)) / max;
}

/** Below this a pixel reads as the unlit hollow rather than as lit colour. */
const DARK = 60;

const arrow = cursorFromCss("cursor-arrow");
const hand = cursorFromCss("cursor-hand");

const index = (x: number, y: number) => (y * arrow.width + x) * 4;

function isDark(img: Decoded, x: number, y: number) {
  const i = index(x, y);
  return img.data[i + 3] >= 32 && luminance(img.data[i], img.data[i + 1], img.data[i + 2]) < DARK;
}

/**
 * The centre window, found by flood-filling the default blade's dark hollow
 * rather than by hardcoding a rectangle — the hollow is not rectangular, and a
 * rectangle would either miss pixels or spill onto the bevel.
 *
 * The blade's base carries its own dark shadow, which is NOT part of the window
 * and must stay dark. It is disconnected from the hollow, so the fill cannot
 * reach it; the bound below fails loudly if that ever stops being true.
 */
const window = (() => {
  const found = new Set<string>();
  const stack: [number, number][] = [[8, 16]];
  while (stack.length) {
    const [x, y] = stack.pop()!;
    const key = `${x},${y}`;
    if (x < 0 || y < 0 || x >= arrow.width || y >= arrow.height) continue;
    if (found.has(key) || !isDark(arrow, x, y)) continue;
    found.add(key);
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return [...found].map((k) => k.split(",").map(Number) as [number, number]);
})();

describe("cursor art", () => {
  it("agrees on size and hotspot-bearing geometry", () => {
    expect(arrow.width).toBe(hand.width);
    expect(arrow.height).toBe(hand.height);
    expect(arrow.width).toBe(23);
    expect(arrow.height).toBe(32);
  });

  it("finds a centre window in the default blade, clear of the base shadow", () => {
    expect(window.length).toBeGreaterThan(20);
    expect(Math.max(...window.map(([, y]) => y))).toBeLessThanOrEqual(24);
  });

  // The point of the hover state: the gem is lit right to the edges of the
  // hollow. A single unlit pixel reads as a chip out of the gem.
  it("fills the whole centre window on hover, leaving nothing dark", () => {
    const unlit = window.filter(([x, y]) => {
      const i = index(x, y);
      return luminance(hand.data[i], hand.data[i + 1], hand.data[i + 2]) < DARK;
    });
    expect(unlit).toEqual([]);
  });

  it("fills that window with colour rather than grey", () => {
    const washedOut = window.filter(([x, y]) => {
      const i = index(x, y);
      return saturation(hand.data[i], hand.data[i + 1], hand.data[i + 2]) <= 0.35;
    });
    expect(washedOut).toEqual([]);
  });

  /**
   * Hovering lights the gem and nothing else. Uniformly brightening the blade
   * flattens the bevel that gives it its shine and shadow, so every pixel
   * outside the window must be byte-identical to the resting cursor.
   */
  it("leaves the blade's shine and shadows exactly as they rest", () => {
    const inWindow = new Set(window.map(([x, y]) => `${x},${y}`));
    const changed: string[] = [];

    for (let y = 0; y < arrow.height; y += 1) {
      for (let x = 0; x < arrow.width; x += 1) {
        if (inWindow.has(`${x},${y}`)) continue;
        const i = index(x, y);
        for (let c = 0; c < 4; c += 1) {
          if (arrow.data[i + c] !== hand.data[i + c]) {
            changed.push(`(${x},${y})`);
            break;
          }
        }
      }
    }

    expect(changed).toEqual([]);
  });
});

export interface UAInfo {
  device: string;
  browser: string;
  os: string;
}

/**
 * Named agents plus a few unambiguous generic tokens.
 *
 * Deliberately a list rather than a broad /bot/i. "bot" appears inside real
 * device names — CUBOT is an Android phone brand — and even /bot\b/ matches it,
 * so a generic rule would silently drop analytics for real mobile visitors. For
 * a filter whose main job is data quality, failing to catch an unnamed crawler
 * is a much better failure than losing real people.
 *
 * `headless` does more than hygiene: it is what keeps the Playwright suite from
 * consuming rate-limit budget, because the events route runs this check before
 * it consults the limiter.
 */
const BOT_PATTERN =
  /(googlebot|bingbot|yandexbot|duckduckbot|baiduspider|applebot|facebookexternalhit|twitterbot|slackbot|linkedinbot|telegrambot|discordbot|whatsapp|ahrefsbot|semrushbot|mj12bot|dotbot|petalbot|bytespider|gptbot|claudebot|ccbot|perplexitybot|crawler|spider|slurp|headless|python-requests|curl\/|wget\/|scrapy|okhttp|go-http-client)/i;

export function isBot(ua: string | null): boolean {
  if (!ua) return false;
  return BOT_PATTERN.test(ua);
}

export function parseUA(ua: string | null): UAInfo {
  const s = ua ?? "";
  const device = /iPad|Tablet/i.test(s)
    ? "Tablet"
    : /Mobi|iPhone|Android/i.test(s)
      ? "Mobile"
      : "Desktop";
  const browser = /Edg\//i.test(s)
    ? "Edge"
    : /OPR\/|Opera/i.test(s)
      ? "Opera"
      : /Chrome\//i.test(s)
        ? "Chrome"
        : /Firefox\//i.test(s)
          ? "Firefox"
          : /Safari\//i.test(s)
            ? "Safari"
            : "Other";
  const os = /Windows/i.test(s)
    ? "Windows"
    : /Android/i.test(s)
      ? "Android"
      : /iPhone|iPad|iOS|like Mac OS X/i.test(s)
        ? "iOS"
        : /Mac OS X|Macintosh/i.test(s)
          ? "macOS"
          : /Linux/i.test(s)
            ? "Linux"
            : "Other";
  return { device, browser, os };
}

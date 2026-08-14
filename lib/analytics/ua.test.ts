import { describe, it, expect } from "vitest";
import { parseUA, isBot } from "./ua";

describe("isBot", () => {
  it.each([
    ["Googlebot", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"],
    ["bingbot", "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)"],
    ["Baiduspider", "Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)"],
    ["Yahoo Slurp", "Mozilla/5.0 (compatible; Yahoo! Slurp; http://help.yahoo.com/help/us/ysearch/slurp)"],
    ["facebookexternalhit", "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"],
    ["AhrefsBot", "Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)"],
    ["GPTBot", "Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)"],
    ["curl", "curl/8.4.0"],
    ["python-requests", "python-requests/2.31.0"],
  ])("flags %s", (_name, ua) => {
    expect(isBot(ua)).toBe(true);
  });

  /**
   * Headless Chromium reports HeadlessChrome, which is how the Playwright suite
   * avoids consuming rate-limit budget: its events are discarded at this check,
   * before the limiter is consulted. Load-bearing, not incidental.
   */
  it("flags headless Chromium, which is what the E2E suite reports", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36";
    expect(isBot(ua)).toBe(true);
  });

  it.each([
    ["Chrome on Windows", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"],
    ["Safari on iPhone", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"],
    ["Firefox on Linux", "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0"],
  ])("does not flag %s", (_name, ua) => {
    expect(isBot(ua)).toBe(false);
  });

  /**
   * The over-matching trap. A naive /bot/i — or even /bot\b/i — flags CUBOT, a
   * real Android phone brand whose name ends in "bot", and would silently drop
   * analytics for everyone using one. Losing real mobile visitors to catch a
   * hypothetical unnamed crawler is the wrong trade for what is primarily a
   * data-quality filter.
   */
  it("does not flag a CUBOT Android device", () => {
    const ua =
      "Mozilla/5.0 (Linux; Android 12; CUBOT NOTE 20) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0 Mobile Safari/537.36";
    expect(isBot(ua)).toBe(false);
  });

  it("treats a missing User-Agent as not-a-bot", () => {
    expect(isBot(null)).toBe(false);
  });
});

describe("parseUA", () => {
  it("parses Chrome on Windows desktop", () => {
    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
    expect(parseUA(ua)).toEqual({ device: "Desktop", browser: "Chrome", os: "Windows" });
  });
  it("parses Safari on iPhone", () => {
    const ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
    expect(parseUA(ua)).toEqual({ device: "Mobile", browser: "Safari", os: "iOS" });
  });
  it("parses Firefox on Linux and Edge", () => {
    expect(parseUA("Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0")).toEqual({ device: "Desktop", browser: "Firefox", os: "Linux" });
    expect(parseUA("Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0 Safari/537.36 Edg/120.0").browser).toBe("Edge");
  });
  it("handles null / empty", () => {
    expect(parseUA(null)).toEqual({ device: "Desktop", browser: "Other", os: "Other" });
  });
});

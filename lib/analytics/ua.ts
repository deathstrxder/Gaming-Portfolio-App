export interface UAInfo {
  device: string;
  browser: string;
  os: string;
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

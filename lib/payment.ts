export function normalizeCard(input: string): string {
  return input.replace(/\D/g, "");
}

export function luhnValid(cardNumber: string): boolean {
  const digits = normalizeCard(cardNumber);
  if (digits.length < 12 || digits.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

export function detectBrand(cardNumber: string): string {
  const d = normalizeCard(cardNumber);
  if (/^4/.test(d)) return "Visa";
  if (/^3[47]/.test(d)) return "Amex";
  if (/^(5[1-5]|2[2-7])/.test(d)) return "Mastercard";
  if (/^(6011|65|64[4-9])/.test(d)) return "Discover";
  return "Card";
}

export function cardLast4(cardNumber: string): string {
  return normalizeCard(cardNumber).slice(-4);
}

// Valid through the end of the expiry month. `now` is injectable for tests.
export function validateExpiry(mmYY: string, now: Date = new Date()): boolean {
  const m = mmYY.match(/^\s*(\d{2})\s*\/\s*(\d{2})\s*$/);
  if (!m) return false;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return false;
  const firstOfNextMonth = new Date(year, month, 1);
  return firstOfNextMonth > now;
}

export function validateCvc(cvc: string, brand?: string): boolean {
  const len = brand === "Amex" ? 4 : 3;
  return new RegExp(`^\\d{${len}}$`).test(cvc);
}

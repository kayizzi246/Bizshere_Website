/**
 * Phone numbers are stored in international format (+256772123456) so one person
 * can't sign up twice by typing the number differently. Local Ugandan forms
 * (0772 123 456, 772123456, 256772123456) are converted. Returns null if invalid.
 */
export function normalizePhone(raw: string): string | null {
  let s = raw.replace(/[\s\-().]/g, "");
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  if (/^0\d{9}$/.test(s)) s = `+256${s.slice(1)}`;
  else if (/^7\d{8}$/.test(s)) s = `+256${s}`;
  else if (/^256\d{9}$/.test(s)) s = `+${s}`;
  return /^\+\d{9,15}$/.test(s) ? s : null;
}

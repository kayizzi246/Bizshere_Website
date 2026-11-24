const clean = (t: string | null | undefined) => (t ?? "").replace(/^Sample:\s*/i, "").trim();

/**
 * An expert's name and business name, as on the client's template (24 Nov 2026). The page title is the expert's
 * name; the business has its own field. Pages typed in the admin between 14 and 24 Nov 2026 hold the business in
 * the title and the person in fullName: those are read the right way round here, and put right when next saved.
 */
export function expertNames(title: string, c: { fullName: string; businessName: string | null }) {
  const name = clean(c.fullName) || clean(title);
  const other = clean(title);
  return { name, business: clean(c.businessName) || (other.toLowerCase() !== name.toLowerCase() ? other : "") || null };
}

/** "0772547273, 0701547273" as separate numbers. */
export const phoneNumbers = (phone: string | null | undefined) => (phone ?? "").split(/[,;/\n]|\bor\b|\band\b/i).map((p) => p.trim()).filter((p) => /\d{5,}/.test(p.replace(/\D/g, "")));

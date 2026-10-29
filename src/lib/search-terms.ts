import type { Prisma } from "@prisma/client";

/**
 * Forgiving word matching for search boxes. People type the way they speak ("fill returns ura",
 * "how to register my business"), so each word becomes a small set of variants:
 *   - filler words ("how", "to", "my") are dropped,
 *   - endings are trimmed so "returns" finds "return" and "filing" finds "file",
 *   - common Ugandan abbreviations and everyday words map to what pages actually say
 *     ("ura" → "Uganda Revenue Authority", "tax"; "fill" → "file").
 * A page matches a word when any of its variants appears in the page's searchable text.
 */

const STOP = new Set([
  "a", "an", "the", "and", "or", "of", "to", "in", "on", "at", "for", "from", "with", "by", "about", "into",
  "how", "what", "where", "when", "which", "who", "why", "do", "does", "did", "can", "could", "should", "would",
  "i", "me", "my", "we", "our", "you", "your", "it", "its", "is", "are", "be", "am", "was", "get", "need", "want",
  "uganda", "ugandan", "kampala", "please", "some", "any",
]);

// Each group: words that mean the same thing on this site. Keys and values are matched as substrings.
const GROUPS: string[][] = [
  ["ura", "uganda revenue authority", "revenue authority", "tax"],
  ["ursb", "uganda registration services bureau", "registration services bureau", "registration", "register"],
  ["nssf", "national social security fund", "social security"],
  ["unbs", "uganda national bureau of standards", "standards", "certification", "q-mark"],
  ["uia", "uganda investment authority", "investment licence", "investment license"],
  ["kcca", "kampala capital city authority", "trading licence", "trading license"],
  ["tin", "taxpayer identification", "tax identification"],
  ["efris", "electronic fiscal receipting", "e-invoicing", "electronic invoicing", "invoicing"],
  ["vat", "value added tax"],
  ["paye", "pay as you earn"],
  ["fill", "file", "filing", "submit", "lodge"],
  ["return", "returns", "declaration"],
  ["register", "registration", "registering", "incorporate", "incorporation"],
  ["licence", "license", "permit"],
  ["loan", "credit", "finance", "financing", "borrow"],
  ["grant", "funding", "fund"],
  ["machine", "machinery", "equipment"],
  ["supplier", "seller", "wholesaler", "distributor", "dealer"],
  ["expert", "consultant", "advisor", "adviser"],
  ["price", "prices", "cost"],
  ["export", "exporting", "exporter"],
  ["import", "importing", "importer", "importation"],
  ["bakery", "bread", "baking"],
  ["mill", "milling", "miller"],
  ["poultry", "chicken", "layers", "broilers", "eggs"],
  ["farm", "farming", "agriculture", "agribusiness"],
];

/** "returns" → "return", "filing" → "fil", "registered" → "register"; short words are kept whole. */
function stem(w: string) {
  if (w.length <= 4) return w;
  for (const end of ["ings", "ing", "ies", "ed", "es", "s"]) {
    if (w.endsWith(end) && w.length - end.length >= 3) return end === "ies" ? `${w.slice(0, -3)}y` : w.slice(0, -end.length);
  }
  return w;
}

/** Words of a query, each with its variants. Duplicates and filler words are removed. */
export function searchTerms(q: string): string[][] {
  const raw = q.toLowerCase().replace(/[“”"'’]/g, " ").split(/[^a-z0-9-]+/).filter(Boolean);
  const kept = raw.filter((w) => !STOP.has(w));
  const words = (kept.length ? kept : raw).slice(0, 10);
  const seen = new Set<string>();
  const out: string[][] = [];
  for (const w of words) {
    const base = stem(w);
    if (seen.has(base)) continue;
    seen.add(base);
    const variants = new Set([w, base]);
    for (const g of GROUPS) {
      if (g.some((x) => x === w || x === base || stem(x) === base)) g.forEach((x) => variants.add(x));
    }
    out.push([...variants]);
  }
  return out;
}

const has = (v: string) => ({ contains: v, mode: "insensitive" as const });

/** Where a content item matches one word (any variant), across its main text and key record fields. */
export function termWhere(variants: string[]): Prisma.ContentItemWhereInput {
  return {
    OR: variants.flatMap((v): Prisma.ContentItemWhereInput[] => [
      { title: has(v) },
      { shortSummary: has(v) },
      { overview: has(v) },
      { primaryCategory: { name: has(v) } },
      { categories: { some: { category: { name: has(v) } } } },
      { guide: { OR: [{ responsibleAuthority: has(v) }, { issuingBody: has(v) }, { purpose: has(v) }, { resourceType: has(v) }, { practicalNotes: has(v) }] } },
      { tool: { purpose: has(v) } },
      { businessIdea: { OR: [{ businessType: has(v) }, { productsOrServices: has(v) }, { licencesToInvestigate: has(v) }] } },
      { machine: { OR: [{ function: has(v) }, { machineType: has(v) }, { productsProduced: has(v) }, { materialsProcessed: has(v) }] } },
      { fundingProgramme: { OR: [{ purpose: has(v) }, { providerCategory: has(v) }] } },
      { investmentOpportunity: { OR: [{ sector: has(v) }, { opportunityType: has(v) }] } },
      { website: { OR: [{ mainFunction: has(v) }, { siteType: has(v) }] } },
      { news: { OR: [{ publisher: has(v) }, { standfirst: has(v) }, { whatChanged: has(v) }] } },
    ]),
  };
}

/** Relevance: title hits weigh most, then the summary. Counts each word once. */
export function termScore(terms: string[][], title: string, summary: string | null) {
  const t = title.toLowerCase();
  const s = (summary ?? "").toLowerCase();
  return terms.reduce((sum, vs) => sum + (vs.some((v) => t.includes(v)) ? 3 : vs.some((v) => s.includes(v)) ? 1 : 0), 0);
}

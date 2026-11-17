/**
 * Reading a spreadsheet of business ideas, suppliers or experts (consultants).
 *
 * The same shape as the supplier-products import (src/lib/product-import.ts), widened to whole
 * content items: the heading row says which column holds what, unknown columns are ignored, and
 * the order of the columns does not matter. Headings are matched loosely — "Business name",
 * "business_name" and "BUSINESS NAME" are the same column — because a real spreadsheet from a
 * client never matches a template exactly.
 *
 * Nothing here touches the database. It turns rows into drafts and says what is wrong with them;
 * the admin checks the drafts on screen and presses Save, and only then does anything get written
 * (src/app/admin/import/actions.ts). An import that writes straight from a file gives the person
 * no chance to notice that every price landed in the wrong column.
 */

import { parseCsv } from "./product-import";

export { parseCsv };

/** What can be imported. The labels are what the admin sees. */
export const IMPORT_KINDS = {
  BUSINESS_IDEA: "Business ideas",
  SUPPLIER: "Suppliers",
  CONSULTANT: "Experts",
} as const;

export type ImportKind = keyof typeof IMPORT_KINDS;

/** At most this many rows in one go, so a 50,000-row paste cannot stall the browser or the server. */
export const MAX_ROWS = 500;

/** A column: the field it fills, the heading shown in the template, and the headings accepted. */
type Column = { field: string; heading: string; accepts: string[]; required?: boolean; note?: string };

const COMMON: Column[] = [
  { field: "title", heading: "Name", accepts: ["name", "title", "businessname", "ideaname", "suppliername", "expertname", "fullname"], required: true },
  { field: "shortSummary", heading: "Short summary", accepts: ["shortsummary", "summary", "tagline", "oneliner", "subtitle"] },
  { field: "overview", heading: "Description", accepts: ["description", "overview", "about", "details", "fulldescription"] },
  { field: "status", heading: "Status", accepts: ["status", "publish", "published", "live"], note: "draft (default), live, waiting or hidden" },
];

const BY_KIND: Record<ImportKind, Column[]> = {
  BUSINESS_IDEA: [
    ...COMMON,
    { field: "businessType", heading: "Business type", accepts: ["businesstype", "type", "sector", "industry"] },
    { field: "businessSize", heading: "Business size", accepts: ["businesssize", "size", "scale"], note: "small, medium or large" },
    { field: "capitalMin", heading: "Capital from", accepts: ["capitalfrom", "capitalmin", "minimumcapital", "startupcostfrom", "capital"] },
    { field: "capitalMax", heading: "Capital to", accepts: ["capitalto", "capitalmax", "maximumcapital", "startupcostto"] },
    { field: "currency", heading: "Currency", accepts: ["currency"], note: "UGX unless you say otherwise" },
    { field: "profitPotential", heading: "Profit potential", accepts: ["profitpotential", "profit", "returns"], note: "low, medium or high" },
    { field: "setupTime", heading: "Setup time", accepts: ["setuptime", "timetostart", "duration"] },
    { field: "locationNotes", heading: "Where it works", accepts: ["wherethisworks", "whereitworks", "locationnotes", "location", "district"] },
    { field: "keyRequirements", heading: "What you need", accepts: ["whatyouneed", "keyrequirements", "requirements", "needs"] },
    { field: "pictureUrl", heading: "Photo address", accepts: ["photoaddress", "photo", "pictureurl", "image", "imageurl", "picture"] },
  ],
  SUPPLIER: [
    ...COMMON,
    { field: "country", heading: "Country", accepts: ["country"] },
    { field: "supplierType", heading: "Supplier type", accepts: ["suppliertype", "kind", "type"], note: "manufacturer, distributor, wholesaler, retailer, importer or service provider" },
    { field: "items", heading: "What they sell", accepts: ["whattheysell", "items", "products", "sells", "goods"], note: "separate with commas" },
    { field: "contactPerson", heading: "Contact person", accepts: ["contactperson", "contact", "person"] },
    { field: "phone", heading: "Phone", accepts: ["phone", "telephone", "tel", "mobile", "phonenumber"] },
    { field: "whatsapp", heading: "WhatsApp", accepts: ["whatsapp", "whatsappnumber"] },
    { field: "email", heading: "Email", accepts: ["email", "emailaddress", "mail"] },
    { field: "website", heading: "Website", accepts: ["website", "web", "url", "site"] },
    { field: "minimumOrder", heading: "Minimum order", accepts: ["minimumorder", "moq", "minorder"] },
  ],
  CONSULTANT: [
    ...COMMON,
    { field: "professionalTitle", heading: "Professional title", accepts: ["professionaltitle", "jobtitle", "role", "profession"] },
    { field: "businessName", heading: "Business name", accepts: ["businessname", "company", "firm", "organisation", "organization"] },
    { field: "specialties", heading: "Specialties", accepts: ["specialties", "specialities", "services", "skills", "expertise"], note: "separate with commas" },
    { field: "languages", heading: "Languages", accepts: ["languages", "language"], note: "separate with commas" },
    { field: "country", heading: "Country", accepts: ["country"] },
    { field: "district", heading: "District", accepts: ["district", "town", "city", "location"] },
    { field: "phone", heading: "Phone", accepts: ["phone", "telephone", "tel", "mobile", "phonenumber"] },
    { field: "email", heading: "Email", accepts: ["email", "emailaddress", "mail"] },
    { field: "website", heading: "Website", accepts: ["website", "web", "url", "site"] },
  ],
};

export const columnsFor = (kind: ImportKind) => BY_KIND[kind];

/** One row ready to be checked on screen. `problems` is what would stop it being saved. */
export type ImportDraft = {
  key: string;
  values: Record<string, string>;
  problems: string[];
};

const plain = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z]/g, "");
const cell = (v: unknown) =>
  v === null || v === undefined ? "" : v instanceof Date ? v.toISOString().slice(0, 10) : String(v).trim();

/** draft | live | waiting | hidden, however it was written. Blank means draft: an import is not published by accident. */
export function statusOf(raw: string): "DRAFT" | "PUBLISHED" | "IN_REVIEW" | "ARCHIVED" {
  const v = plain(raw);
  if (!v) return "DRAFT";
  if (["live", "yes", "published", "publish", "show", "shown", "true", "y"].includes(v)) return "PUBLISHED";
  if (["waiting", "review", "inreview", "pending"].includes(v)) return "IN_REVIEW";
  if (["hidden", "hide", "no", "archived", "false", "n", "off"].includes(v)) return "ARCHIVED";
  return "DRAFT";
}

const SUPPLIER_TYPES = ["MANUFACTURER", "DISTRIBUTOR", "WHOLESALER", "RETAILER", "IMPORTER", "SERVICE_PROVIDER"];

/** "service provider", "Service-Provider" → SERVICE_PROVIDER. Empty when it matches nothing. */
export function supplierTypeOf(raw: string): string {
  const v = String(raw ?? "").toUpperCase().replace(/[^A-Z]+/g, "_").replace(/(^_|_$)/g, "");
  if (SUPPLIER_TYPES.includes(v)) return v;
  if (v === "SERVICE" || v === "SERVICES") return "SERVICE_PROVIDER";
  return "";
}

/** A number from a cell that may hold "1,500,000", "UGX 1.5m" or "1500000". Empty when there is none. */
export function moneyOf(raw: string): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  const m = /(\d[\d,. ]*)\s*(m|million|k|thousand|bn|billion)?/i.exec(s.replace(/[^\d,. a-zA-Z]/g, " "));
  if (!m) return "";
  const n = Number(m[1].replace(/[, ]/g, ""));
  if (!Number.isFinite(n)) return "";
  const scale = (m[2] ?? "").toLowerCase();
  const factor = scale.startsWith("m") ? 1_000_000 : scale.startsWith("k") || scale.startsWith("t") ? 1_000 : scale.startsWith("b") ? 1_000_000_000 : 1;
  return String(Math.round(n * factor));
}

/** Which column holds which field, from the heading row. Unknown headings are ignored. */
function matchColumns(kind: ImportKind, headings: unknown[]): Record<string, number> {
  const found: Record<string, number> = {};
  headings.forEach((h, i) => {
    const name = plain(h);
    if (!name) return;
    for (const col of BY_KIND[kind]) {
      if (found[col.field] === undefined && col.accepts.includes(name)) { found[col.field] = i; return; }
    }
  });
  return found;
}

/**
 * Drafts from a sheet's rows (the first non-empty row holds the headings).
 *
 * `error` means the file cannot be used at all. Otherwise every row comes back, including the ones
 * with problems, so the admin can see what is wrong rather than wondering where a row went.
 */
export function draftsFromRows(kind: ImportKind, rows: unknown[][]): { drafts: ImportDraft[]; skipped: number; error?: string } {
  const start = rows.findIndex((r) => r.some((c) => cell(c)));
  if (start < 0) return { drafts: [], skipped: 0, error: "The file is empty." };

  const cols = matchColumns(kind, rows[start]);
  if (cols.title === undefined) {
    return { drafts: [], skipped: 0, error: `No name column found. The first row must name the columns — "Name" at least. Download the template to see them all.` };
  }

  const drafts: ImportDraft[] = [];
  let skipped = 0;
  const seen = new Set<string>();

  for (const [n, r] of rows.slice(start + 1).entries()) {
    if (!r.some((c) => cell(c))) continue;
    if (drafts.length >= MAX_ROWS) { skipped++; continue; }

    const get = (f: string) => (cols[f] === undefined ? "" : cell(r[cols[f]!]));
    const title = get("title").slice(0, 200);
    if (!title) { skipped++; continue; }

    const values: Record<string, string> = { title };
    for (const col of BY_KIND[kind]) {
      if (col.field === "title") continue;
      const raw = get(col.field);
      if (!raw) continue;
      values[col.field] =
        col.field === "capitalMin" || col.field === "capitalMax" ? moneyOf(raw)
        : col.field === "supplierType" ? supplierTypeOf(raw)
        : col.field === "currency" ? raw.toUpperCase().slice(0, 3)
        : raw.slice(0, 4000);
    }
    values.status = statusOf(get("status"));

    const problems: string[] = [];
    const key = title.toLowerCase();
    if (seen.has(key)) problems.push("The same name appears earlier in this file");
    seen.add(key);
    if (get("supplierType") && !values.supplierType) problems.push(`"${get("supplierType")}" is not a supplier type`);
    for (const f of ["capitalMin", "capitalMax"]) {
      if (get(f) && !values[f]) problems.push(`"${get(f)}" is not a number`);
    }
    if (values.capitalMin && values.capitalMax && Number(values.capitalMin) > Number(values.capitalMax)) {
      problems.push("Capital from is more than capital to");
    }
    if (values.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email)) problems.push(`"${values.email}" is not an email address`);

    drafts.push({ key: `row-${n}`, values, problems });
  }

  return { drafts, skipped, ...(drafts.length ? {} : { error: "No rows found under the headings." }) };
}

/** The template a person downloads, fills in and imports. One heading row, one example row. */
export function templateCsv(kind: ImportKind): string {
  const cols = BY_KIND[kind];
  const example: string = {
    BUSINESS_IDEA: "Poultry farming,Layers for eggs in peri-urban Kampala,,draft,Agriculture,small,2000000,5000000,UGX,medium,2 - 3 weeks,Wakiso and Mukono,Land; feed; day-old chicks,",
    SUPPLIER: "Kampala Feeds Ltd,Animal feeds and veterinary supplies,,draft,Uganda,wholesaler,\"Layer mash, broiler starter\",Jane Doe,0772123456,0772123456,sales@example.com,https://example.com,10 bags",
    CONSULTANT: "Jane Doe,Tax and compliance for small shops,,draft,Tax advisor,Doe Associates,\"Tax, bookkeeping\",\"English, Luganda\",Uganda,Kampala,0772123456,jane@example.com,https://example.com",
  }[kind];
  const cell = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  return `${cols.map((c) => cell(c.heading)).join(",")}\n${example}\n`;
}

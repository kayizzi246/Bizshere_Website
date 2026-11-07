/**
 * A supplier's products as the admin's product window edits them (src/app/admin/content/ProductsManager.tsx),
 * and reading them from a spreadsheet: a CSV file, or the rows of an Excel sheet (read in the browser).
 * Column names are matched loosely, so a file people already have usually works as it is:
 * "Product", "Product name" or "Name"; "Price", "Price from" or "Price (UGX)"; "MOQ" or "Minimum order"…
 * Nothing here touches the database; the server checks every value again when the window is saved.
 */

export const PRODUCT_STATUSES = ["PUBLISHED", "DRAFT", "IN_REVIEW", "ARCHIVED"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];
export const STATUS_LABEL: Record<ProductStatus, string> = { PUBLISHED: "Live", DRAFT: "Draft", IN_REVIEW: "Waiting", ARCHIVED: "Hidden" };

/** One product while it is being edited: every value as typed. `id` only once it is saved. */
export type ProductDraft = {
  key: string;
  id?: string;
  productName: string;
  priceMin: string;
  priceMax: string;
  currency: string;
  unit: string;
  minimumOrderQuantity: string;
  availability: string;
  specifications: string;
  imageUrl: string;
  status: ProductStatus;
};

export const MAX_PRODUCTS = 2000;

let counter = 0;
export const newKey = () => `new-${Date.now().toString(36)}-${(counter++).toString(36)}`;

export const emptyProduct = (): ProductDraft => ({
  key: newKey(), productName: "", priceMin: "", priceMax: "", currency: "UGX", unit: "", minimumOrderQuantity: "",
  availability: "", specifications: "", imageUrl: "", status: "PUBLISHED",
});

type Field = Exclude<keyof ProductDraft, "key" | "id">;

// Column names people use, reduced to letters only ("Price (UGX)" → "priceugx")
const COLUMNS: [Field, string[]][] = [
  ["productName", ["productname", "product", "name", "item", "itemname", "products", "title"]],
  ["priceMin", ["price", "pricefrom", "minprice", "priceugx", "unitprice", "cost", "pricemin", "amount", "sellingprice"]],
  ["priceMax", ["priceto", "maxprice", "pricemax", "priceupto"]],
  ["currency", ["currency", "cur"]],
  ["unit", ["unit", "packageunit", "package", "packaging", "packsize", "units", "uom"]],
  ["minimumOrderQuantity", ["minimumorder", "minorder", "moq", "minimum", "minimumquantity", "minqty"]],
  ["availability", ["availability", "stock", "instock", "available"]],
  ["specifications", ["description", "details", "specifications", "specs", "about", "notes"]],
  ["imageUrl", ["photo", "image", "picture", "imageurl", "photourl", "picturelink", "imagelink"]],
  ["status", ["status", "show", "live", "showonwebsite"]],
];
const plain = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z]/g, "");

/** Which column holds what, from the heading row. Unknown headings are ignored. */
export function matchColumns(headings: unknown[]): Partial<Record<Field, number>> {
  const found: Partial<Record<Field, number>> = {};
  headings.forEach((h, i) => {
    const name = plain(h);
    if (!name) return;
    for (const [field, names] of COLUMNS) if (found[field] === undefined && names.includes(name)) { found[field] = i; return; }
  });
  return found;
}

function statusOf(raw: string): ProductStatus {
  const v = plain(raw);
  if (!v || ["live", "yes", "published", "show", "shown", "true", "y"].includes(v)) return "PUBLISHED";
  if (["draft", "notyet"].includes(v)) return "DRAFT";
  if (["waiting", "review", "inreview", "pending"].includes(v)) return "IN_REVIEW";
  if (["hidden", "hide", "no", "archived", "false", "n", "off"].includes(v)) return "ARCHIVED";
  return "PUBLISHED";
}

const cell = (v: unknown) => (v === null || v === undefined ? "" : v instanceof Date ? v.toISOString().slice(0, 10) : String(v).trim());

/**
 * Products from a sheet's rows (the first row holds the headings). Returns the products, and a message
 * when the file can't be used. Empty rows are skipped; a row with no name is skipped and counted.
 */
export function productsFromRows(rows: unknown[][]): { products: ProductDraft[]; skipped: number; error?: string } {
  const start = rows.findIndex((r) => r.some((c) => cell(c)));
  if (start < 0) return { products: [], skipped: 0, error: "The file is empty." };
  const cols = matchColumns(rows[start]);
  if (cols.productName === undefined) return { products: [], skipped: 0, error: "No product name column found. Name the first column \"Product name\" (download the template to see all the columns)." };
  const products: ProductDraft[] = [];
  let skipped = 0;
  for (const r of rows.slice(start + 1)) {
    if (!r.some((c) => cell(c))) continue;
    const get = (f: Field) => (cols[f] === undefined ? "" : cell(r[cols[f]!]));
    const productName = get("productName");
    if (!productName) { skipped++; continue; }
    products.push({
      ...emptyProduct(),
      productName: productName.slice(0, 200),
      priceMin: get("priceMin"), priceMax: get("priceMax"),
      currency: (get("currency") || "UGX").toUpperCase().slice(0, 3),
      unit: get("unit"), minimumOrderQuantity: get("minimumOrderQuantity"), availability: get("availability"),
      specifications: get("specifications"), imageUrl: get("imageUrl"), status: statusOf(get("status")),
    });
    if (products.length >= MAX_PRODUCTS) break;
  }
  return { products, skipped, ...(products.length ? {} : { error: "No products found under the headings." }) };
}

/** A CSV file's rows. Commas, semicolons or tabs, quoted values, and a leading byte-order mark are all handled. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const first = src.split(/\r?\n/, 1)[0] ?? "";
  const counts = ([",", ";", "\t"] as const).map((d) => [d, first.split(d).length] as const);
  const sep = counts.sort((a, b) => b[1] - a[1])[0][0];
  const rows: string[][] = [];
  let row: string[] = [], value = "", quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { value += '"'; i++; }
      else if (c === '"') quoted = false;
      else value += c;
    } else if (c === '"' && value === "") quoted = true;
    else if (c === sep) { row.push(value); value = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(value); rows.push(row); row = []; value = "";
    } else value += c;
  }
  if (value !== "" || row.length) { row.push(value); rows.push(row); }
  return rows;
}

/** The template people can download and fill in. */
export const TEMPLATE_CSV = [
  "Product name,Price from,Price to,Currency,Package unit,Minimum order,Availability,Description,Photo,Status",
  "Maize flour,65000,,UGX,50 kg bag,1,In stock,Grade 1 maize flour,,Live",
  "White sugar,180000,195000,UGX,50 kg bag,2,2 weeks,,,Draft",
].join("\r\n");

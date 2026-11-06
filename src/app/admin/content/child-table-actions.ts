"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { SITE_DATA } from "@/lib/cached";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireItemArea } from "@/lib/access";
import { audit } from "@/lib/audit";
import { childTable, delegate } from "@/lib/child-tables";
import { parentIds, refOptions } from "@/lib/child-data";
import { looseNumber, parseField } from "@/lib/field-parse";

/** Saves and deletes rows of the child tables in src/lib/child-tables.ts. */

const s = (form: FormData, k: string) => String(form.get(k) ?? "").trim();
// `in`: shown in that section, where the person is looking. `t`: every result is new, even the same one twice.
const back = (id: string, key: string, msg: string): never => redirect(`/admin/content/${id}?${msg}&in=${key}&t=${Date.now()}#t-${key}`);
// Columns that are required with a database default: an empty box keeps the default rather than clearing it.
const KEEP_DEFAULT = new Set(["currency", "timeZone"]);

export async function saveChildRow(form: FormData) {
  const editor = await requireItemArea(s(form, "contentItemId"));
  const contentItemId = s(form, "contentItemId");
  const table = childTable(s(form, "table"));
  const rowId = s(form, "rowId");
  if (!table || table.displayOnly) return back(contentItemId, "", "error=Unknown+table");
  const p = await parentIds(contentItemId);
  const scope = p ? table.scope(p) : null;
  if (!p || !scope) return back(contentItemId, table.key, "error=" + encodeURIComponent(`Link this record to an organization before adding ${table.label.toLowerCase()}.`));

  const errors: Record<string, string> = {};
  const data: Record<string, unknown> = {};
  for (const f of table.fields) {
    const raw = s(form, `c_${f.name}`);
    if (f.required && raw === "") { errors[f.name] = "Required"; continue; }
    if (f.kind === "ref") {
      // Only ids offered in the form are accepted (tool versions: this tool's only).
      if (raw && !(await refOptions(f.ref!, p)).some((o) => o.value === raw)) errors[f.name] = "Choose from the list";
      data[f.name] = raw || null;
      continue;
    }
    const v = parseField({ name: f.name, kind: f.kind, options: f.options }, f.kind === "decimal" ? looseNumber(raw) : raw, errors);
    if (v === null && (f.kind === "bool" || KEEP_DEFAULT.has(f.name))) continue;
    // The database only takes a three-letter code in capitals
    if (f.name === "currency") {
      const code = String(v).toUpperCase();
      if (!/^[A-Z]{3}$/.test(code)) errors.currency = "Three letters, e.g. UGX";
      data.currency = code;
      continue;
    }
    data[f.name] = v;
  }
  if (table.key === "reviews" && data.rating !== undefined && (Number(data.rating) < 1 || Number(data.rating) > 5)) errors.rating = "1 to 5";
  // Typed the wrong way round: the meaning is clear, so put them right
  if (data.priceMin && data.priceMax && Number(data.priceMin) > Number(data.priceMax)) [data.priceMin, data.priceMax] = [data.priceMax, data.priceMin];
  if (Object.keys(errors).length) {
    const msg = Object.entries(errors).map(([k, v]) => `${table.fields.find((f) => f.name === k)?.label ?? k}: ${v}`).join("; ");
    // `f`: the form stays the same one, so what was typed stays in it
    return back(contentItemId, table.key, `error=${encodeURIComponent(msg)}&f=${encodeURIComponent(s(form, "formKey"))}`);
  }

  // A supplier product's price date is the day its price was last saved (as in the seller's dashboard).
  if (table.key === "listings") data.quotedAt = data.priceMin || data.priceMax ? new Date() : null;
  const model = delegate(prisma, table.model);
  if (rowId) {
    const { count } = await model.updateMany({ where: { id: rowId, ...scope }, data });
    if (!count) return back(contentItemId, table.key, "error=Row+not+found");
  } else {
    await model.create({ data: { ...data, ...(table.link?.(p) ?? {}) } });
  }
  await audit(editor.id, rowId ? "child.updated" : "child.created", table.model, contentItemId, { table: table.key });
  revalidatePath(`/admin/content/${contentItemId}`);
  revalidateTag(SITE_DATA);
  back(contentItemId, table.key, s(form, "another") ? "saved=child&added=1" : "saved=child");
}

export async function deleteChildRow(form: FormData) {
  const editor = await requireItemArea(s(form, "contentItemId"));
  const contentItemId = s(form, "contentItemId");
  const table = childTable(s(form, "table"));
  const rowId = s(form, "rowId");
  if (!table || table.displayOnly || !rowId) return back(contentItemId, "", "error=Unknown+row");
  const p = await parentIds(contentItemId);
  const scope = p ? table.scope(p) : null;
  if (!scope) return back(contentItemId, table.key, "error=Row+not+found");
  await delegate(prisma, table.model).deleteMany({ where: { id: rowId, ...scope } });
  await audit(editor.id, "child.deleted", table.model, contentItemId, { table: table.key });
  revalidatePath(`/admin/content/${contentItemId}`);
  revalidateTag(SITE_DATA);
  back(contentItemId, table.key, "saved=removed");
}

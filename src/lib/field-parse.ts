import { Prisma } from "@prisma/client";
import type { Field } from "./content-fields";

/**
 * Turns one submitted form value into the value stored in the database, by field kind.
 * Shared by the main content form and the child-record editors. Empty means unknown
 * (NULL), never zero. Problems are written to `errors` under the field name.
 */
export function parseField(f: Pick<Field, "name" | "kind" | "options">, raw: string, errors: Record<string, string>): unknown {
  if (f.kind === "list") return raw ? raw.split(",").map((x) => x.trim()).filter(Boolean) : [];
  if (raw === "") return f.kind === "json" ? Prisma.DbNull : null;
  switch (f.kind) {
    case "int": {
      const n = Number(raw);
      if (!Number.isInteger(n)) errors[f.name] = "Whole number";
      return n;
    }
    case "decimal": {
      const clean = raw.replace(/[,\s]/g, "");
      const n = Number(clean);
      if (Number.isNaN(n) || n < 0) { errors[f.name] = "Number, 0 or more"; return null; }
      return new Prisma.Decimal(clean);
    }
    case "bool": return raw === "true";
    case "date": {
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) errors[f.name] = "Invalid date";
      return d;
    }
    case "enum":
      if (!f.options?.includes(raw)) errors[f.name] = "Choose an option";
      return raw;
    case "url":
      // A full web address, or a path to a file on this site such as /ideas/bakery.jpg
      if (!/^(https?:\/\/|\/[^/])/i.test(raw)) errors[f.name] = "Must start with https:// (or / for a file on this site)";
      return raw;
    case "json":
      try { return JSON.parse(raw); } catch { errors[f.name] = "Invalid JSON"; return null; }
    default: return raw;
  }
}

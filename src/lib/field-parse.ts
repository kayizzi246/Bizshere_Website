import { Prisma } from "@prisma/client";
import type { Field } from "./content-fields";

/**
 * Turns one submitted form value into the value stored in the database, by field kind.
 * Shared by the main content form and the child-record editors. Empty means unknown
 * (NULL), never zero. Problems are written to `errors` under the field name.
 */
/**
 * The number in what someone naturally types: "UGX 5,000" or "10 bags". Anything unclear is returned
 * as typed, for parseField to refuse: "5-10" is two numbers, "5k" isn't 5, and -1 stays negative.
 */
export function looseNumber(raw: string) {
  const found = raw.match(/\d[\d,]*(?:\.\d+)?/g);
  if (found?.length !== 1 || /-\s*\d|\d\s*[km]\b/i.test(raw)) return raw;
  return found[0];
}

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
      if (!clean || !Number.isFinite(n) || n < 0 || !/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(clean)) { errors[f.name] = "Numbers only, e.g. 5000"; return null; }
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

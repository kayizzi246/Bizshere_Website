import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import type { ContentType } from "@prisma/client";
import { directoryFor, isMemberOnly, MAIN, MONEY_FIELDS, type Field } from "@/lib/content-fields";
import { date, money } from "@/lib/format";

/**
 * Every field group an editor can fill in (src/lib/content-fields.ts), shown on the
 * public page. Driven by the same list as the admin form, so a field added there
 * appears here too. Empty fields are left out; groups with nothing filled are skipped.
 *
 * Member detail (MEMBER_ONLY) is replaced by a lock on gated pages. Its value is
 * never rendered, so it never reaches the browser.
 */
type Rec = Record<string, unknown>;

// Media and fields the page header already shows.
const ALWAYS_SKIP = new Set(["pictureUrl", "pictureCredit", "photoUrl", "videoUrls", "videoUrl", "currency"]);

// Plain objects are JSON fields; Prisma's Decimal and Date are not plain.
const isPlain = (v: unknown) => typeof v === "object" && v !== null && Object.getPrototypeOf(v) === Object.prototype;
const isEmpty = (v: unknown) =>
  v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0) || (isPlain(v) && Object.keys(v as object).length === 0);
const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");

export function visibleGroups(type: ContentType, record: Rec, skip: string[] = []) {
  const dir = directoryFor(type);
  if (!dir) return [];
  const skipped = new Set([...skip, ...ALWAYS_SKIP]);
  const groups = new Map<string, Field[]>();
  for (const f of dir.fields) {
    const g = f.group ?? "Details";
    if (g === MAIN || skipped.has(f.name) || isEmpty(record[f.name])) continue;
    groups.set(g, [...(groups.get(g) ?? []), f]);
  }
  return [...groups.entries()];
}

/** How many filled fields the groups hold, for the "All details" count. */
export const fieldCount = (groups: ReturnType<typeof visibleGroups>) => groups.reduce((n, [, fields]) => n + fields.length, 0);

/**
 * `bare`: just the groups, for a page that puts them inside its own section (RecordPage's "All details").
 * `table`: one plain two-column table, rows in alternating colours, no group headings (the product page).
 */
export function FieldSections({ type, record, gated, skip, back, bare = false, table = false }: { type: ContentType; record: Rec; gated: boolean; skip?: string[]; back: string; bare?: boolean; table?: boolean }) {
  const groups = visibleGroups(type, record, skip);
  if (!groups.length) return null;
  const currency = typeof record.currency === "string" ? record.currency : "UGX";

  if (table) {
    const fields = groups.flatMap(([, fs]) => fs);
    return (
      <dl className="overflow-hidden rounded-xl border border-line">
        {fields.map((f, n) => (
          <div key={f.name} className={`grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 px-4 py-2.5 text-[13px] sm:text-sm ${n % 2 ? "bg-white" : "bg-brand-tint/50"}`}>
            <dt className="text-ink-muted">{f.label}</dt>
            <dd className="min-w-0 break-words font-semibold text-heading">
              {gated && isMemberOnly(type, f) ? <Locked back={back} /> : <Value f={f} v={record[f.name]} currency={currency} />}
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  // Groups pack two to a row; a group with long text takes the full width.
  const body = (
      <div className="grid gap-4 md:grid-cols-2">
        {groups.map(([group, fields]) => {
          const short = fields.filter((f) => f.kind !== "textarea" && f.kind !== "json");
          const long = fields.filter((f) => f.kind === "textarea" || f.kind === "json");
          return (
            <div key={group} className={`flex flex-col gap-3 rounded-2xl ${bare ? "bg-page p-4 sm:p-5" : "border border-line bg-white p-6"} ${long.length ? "md:col-span-2" : ""}`}>
              <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-ink-muted">{group}</h3>
              {short.length ? (
                <dl className={`grid divide-y divide-line ${long.length ? "sm:grid-cols-2 sm:gap-x-8 sm:divide-y-0" : ""}`}>
                  {short.map((f) => (
                    <div key={f.name} className={`flex items-start justify-between gap-6 py-2.5 ${long.length ? "sm:border-b sm:border-line" : ""}`}>
                      <dt className="shrink-0 text-[13px] text-ink-muted">{f.label}</dt>
                      <dd className="min-w-0 text-right text-[13px] font-semibold text-ink">
                        {gated && isMemberOnly(type, f) ? <Locked back={back} /> : <Value f={f} v={record[f.name]} currency={currency} />}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {long.map((f) => (
                <div key={f.name} className={`flex flex-col gap-1.5 rounded-xl p-4 ${bare ? "bg-white" : "bg-page"}`}>
                  <h4 className="text-xs font-extrabold text-ink-muted">{f.label}</h4>
                  {gated && isMemberOnly(type, f) ? <Locked back={back} /> : <Value f={f} v={record[f.name]} currency={currency} />}
                </div>
              ))}
            </div>
          );
        })}
      </div>
  );
  if (bare) return body;
  return (
    <section id="details" className="flex scroll-mt-36 flex-col gap-4">
      <h2 className="font-display text-xl font-extrabold tracking-[-0.01em] text-heading">Full details</h2>
      {body}
    </section>
  );
}

function Value({ f, v, currency }: { f: Field; v: unknown; currency: string }) {
  switch (f.kind) {
    case "bool":
      return <>{v ? "Yes" : "No"}</>;
    case "int":
    case "decimal":
      return <>{MONEY_FIELDS.has(f.name) ? money(v as number, currency) : Number(v).toLocaleString("en-GB")}</>;
    case "date":
      return <>{date(v as Date)}</>;
    case "enum":
      return <>{titleCase(String(v))}</>;
    case "list":
      return (
        <span className="flex flex-wrap justify-end gap-1.5">
          {(v as string[]).map((x) => <span key={x} className="rounded-full bg-page px-2.5 py-0.5 text-xs font-medium text-ink-soft">{x}</span>)}
        </span>
      );
    case "url": {
      const href = String(v);
      return <a href={href} target={href.startsWith("/") ? undefined : "_blank"} rel="noopener noreferrer" className="break-all font-semibold">{href.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a>;
    }
    case "textarea":
      return <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">{String(v)}</p>;
    case "json": {
      const entries = Object.entries(v as Rec);
      return (
        <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          {entries.map(([k, x]) => (
            <div key={k} className="flex justify-between gap-4 border-b border-dashed border-line pb-1.5">
              <dt className="text-ink-muted">{titleCase(k)}</dt>
              <dd className="font-semibold">{typeof x === "object" ? JSON.stringify(x) : String(x)}</dd>
            </div>
          ))}
        </dl>
      );
    }
    default:
      return <>{String(v)}</>;
  }
}

function Locked({ back }: { back: string }) {
  return (
    <Link href={back} data-onboard="" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand">
      <LockKeyhole aria-hidden className="h-3.5 w-3.5" /> Tap to see
    </Link>
  );
}

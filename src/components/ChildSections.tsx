import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import type { ContentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { date, money } from "@/lib/format";
import { delegate, tablesFor, type ChildField, type ChildTable, type ParentIds } from "@/lib/child-tables";
import { refInclude, refLabel } from "@/lib/child-data";
import { Icon } from "./Icon";

/**
 * The public side of the child tables (src/lib/child-tables.ts): offers, listings, branches,
 * contacts, rounds, steps, documents, fees, services, qualifications, projects, reviews,
 * versions and media. Only public rows (publicWhere) are read, internal fields are never
 * shown, and member fields are replaced by a lock on gated pages without being rendered.
 */
type Row = Record<string, unknown>;
const MONEY = new Set(["priceMin", "priceMax", "deliveryCharge", "amount", "minimumOrderQuantity"]);

export async function loadChildSections(type: ContentType, p: ParentIds) {
  const tables = tablesFor(type).filter((x) => !x.adminOnly);
  const loaded = await Promise.all(tables.map(async (table) => {
    const scope = table.scope(p);
    if (!scope) return { table, rows: [] as Row[] };
    const rows = await delegate(prisma, table.model).findMany({ where: { ...scope, ...table.publicWhere }, orderBy: table.orderBy, include: refInclude(table.fields) });
    return { table, rows };
  }));
  return loaded.filter((x) => x.rows.length > 0);
}

export function ChildSections({ sections, gated, back }: { sections: Awaited<ReturnType<typeof loadChildSections>>; gated: boolean; back: string }) {
  if (!sections.length) return null;
  return (
    <>
      {sections.map(({ table, rows }) => (
        <section key={table.key} id={`c-${table.key}`} className="flex scroll-mt-36 flex-col gap-3">
          <h2 className="font-sans text-xl font-black tracking-[-0.01em] text-heading">{table.label}</h2>
          {table.layout === "steps" ? <Steps table={table} rows={rows} />
            : table.layout === "gallery" ? <Gallery rows={rows} gated={gated} back={back} />
            : (
              <div className="grid gap-3 sm:grid-cols-2">
                {rows.map((row) => <Card key={String(row.id)} table={table} row={row} gated={gated} back={back} />)}
              </div>
            )}
        </section>
      ))}
    </>
  );
}

function Card({ table, row, gated, back }: { table: ChildTable; row: Row; gated: boolean; back: string }) {
  const head = table.fields.find((f) => f.name === table.heading);
  const link = head?.kind === "ref" ? refLabel(head, row) : null;
  const title = table.key === "reviews" ? `${"★".repeat(Number(row.rating))}${"☆".repeat(5 - Number(row.rating))}`
    : table.key === "rounds" ? `${String(row.status).charAt(0)}${String(row.status).slice(1).toLowerCase()} round`
    : link?.label ?? (row[table.heading] ? String(row[table.heading]) : null);
  const fields = table.fields.filter((f) => f.name !== table.heading && !f.internal && f.name !== "currency" && filled(row[f.name]));
  const short = fields.filter((f) => f.kind !== "textarea");
  const long = fields.filter((f) => f.kind === "textarea");
  const currency = typeof row.currency === "string" ? row.currency : "UGX";

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-6">
      {title ? (
        link?.href ? <Link href={link.href} className="font-display text-[15px] font-bold leading-tight text-heading hover:text-brand">{title}</Link>
          : <span className={`font-display text-[15px] font-bold leading-tight ${table.key === "reviews" ? "text-accent" : "text-heading"}`}>{title}</span>
      ) : null}
      {table.key === "reviews" && row.confirmedEngagement ? <span className="-mt-1 text-xs font-semibold text-brand">Confirmed engagement</span> : null}
      {short.length ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          {short.map((f) => (
            <div key={f.name} className="flex min-w-0 flex-col">
              <dt className="text-[11px] text-ink-muted">{f.label}</dt>
              <dd className="break-words text-[13px] font-semibold text-ink">{gated && f.member ? <Locked back={back} /> : <Value f={f} v={row[f.name]} row={row} currency={currency} />}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {long.map((f) => (
        <div key={f.name} className="flex flex-col gap-0.5">
          <span className="text-[11px] text-ink-muted">{f.label}</span>
          {gated && f.member ? <Locked back={back} /> : <p className="whitespace-pre-line text-[13px] leading-relaxed text-ink-soft">{String(row[f.name])}</p>}
        </div>
      ))}
    </div>
  );
}

function Steps({ table, rows }: { table: ChildTable; rows: Row[] }) {
  return (
    <ol className="flex flex-col gap-2">
      {rows.map((row, n) => (
        <li key={String(row.id)} className="flex gap-3 rounded-xl border border-line bg-white p-4">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-tint text-xs font-bold text-brand">{n + 1}</span>
          <span className="flex flex-col gap-1">
            <span className="text-sm leading-relaxed text-ink">{String(row[table.heading])}</span>
            {row.isOfficial === false ? <span className="text-xs font-semibold text-accent-dark">BizSphere tip, not an official step</span> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Gallery({ rows, gated, back }: { rows: Row[]; gated: boolean; back: string }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {rows.map((row) => {
        const lockedFile = gated && row.accessLevel !== "PUBLIC";
        const caption = (row.caption as string) || (row.mediaType === "document" ? "Document" : row.mediaType === "video" ? "Video" : "");
        return (
          <figure key={String(row.id)} className="flex flex-col gap-1.5">
            {lockedFile ? (
              <Link href={back} data-onboard="" className="flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-strong bg-page text-xs font-semibold text-brand">
                <LockKeyhole aria-hidden className="h-4 w-4" />Members only
              </Link>
            ) : row.mediaType === "image" ? (
              <a href={String(row.fileLocation)} target="_blank" rel="noopener noreferrer">
                {/* Editor-entered address; no Next image domain list to maintain. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={String(row.fileLocation)} alt={(row.altText as string) || caption} loading="lazy" className="aspect-[4/3] w-full rounded-lg border border-line bg-white object-cover" />
              </a>
            ) : (
              <a href={String(row.fileLocation)} target="_blank" rel="noopener noreferrer" className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-lg border border-line bg-white text-sm font-semibold text-heading hover:border-brand">
                <Icon name={row.mediaType === "video" ? "video" : "download"} className="h-6 w-6 text-brand" />
                {row.mediaType === "video" ? "Watch" : "Open"}
              </a>
            )}
            {caption || row.credit ? (
              <figcaption className="text-xs text-ink-muted">{caption}{caption && row.credit ? " · " : ""}{(row.credit as string) ?? ""}</figcaption>
            ) : null}
          </figure>
        );
      })}
    </div>
  );
}

const filled = (v: unknown) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0);

function Value({ f, v, row, currency }: { f: ChildField; v: unknown; row: Row; currency: string }) {
  if (typeof v === "boolean") return <>{v ? "Yes" : "No"}</>;
  if (v instanceof Date) return <>{date(v)}</>;
  if (Array.isArray(v)) return <>{v.join(", ")}</>;
  if (f.kind === "ref") {
    // A linked record (district, machine, supplier...): show its name, never the raw id.
    const l = refLabel(f, row);
    if (!l?.label) return <span className="font-normal text-ink-muted">Not added yet</span>;
    return l.href ? <Link href={l.href}>{l.label}</Link> : <>{l.label}</>;
  }
  if (f.kind === "url") {
    const href = String(v);
    return <a href={href} target="_blank" rel="noopener noreferrer" className="break-all">{f.name === "applicationUrl" ? "Apply ↗" : f.name === "quotationUrl" ? "View quotation ↗" : href.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a>;
  }
  if (f.kind === "enum") return <>{String(v).charAt(0) + String(v).slice(1).toLowerCase().replace(/_/g, " ")}</>;
  if ((f.kind === "decimal" || f.kind === "int") && MONEY.has(f.name) && f.name !== "minimumOrderQuantity") return <>{money(v as number, currency)}</>;
  if (f.kind === "decimal" || f.kind === "int") return <>{Number(v).toLocaleString("en-GB")}</>;
  return <>{String(v)}</>;
}

function Locked({ back }: { back: string }) {
  return (
    <Link href={back} data-onboard="" className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand">
      <LockKeyhole aria-hidden className="h-3 w-3" /> Members only
    </Link>
  );
}

import Link from "next/link";
import { Fragment } from "react";

/** One row: the name opens its page; `cells` follow the headings. `sub` is the line under the name on phones. */
export type TableRow = { id: string; slug: string; href: string; name: string; photo: string | null; sub?: string | null; cells: (string | null)[] };

/**
 * The client's directory table (experts and suppliers, 24 Nov 2026): S/N, the name with its photo or logo, then the
 * columns. The whole row opens the page. Phones: each row is a card with the same details by name, as six columns
 * don't fit.
 */
export function DirectoryTable({ nameHeading, headings, rows, from = 1 }: { nameHeading: string; headings: string[]; rows: TableRow[]; /** S/N of the first row */ from?: number }) {
  const th = "px-4 py-3 text-left text-[12px] font-semibold text-white";
  const td = "px-4 py-3.5 align-middle text-[13px] text-ink-soft";
  return (
    <>
      <div className="mx-auto hidden w-full max-w-[1040px] overflow-x-auto rounded-2xl border border-line bg-white md:block">
        <table className="w-full border-collapse">
          <thead className="bg-brand-deep"><tr>
            <th scope="col" className={`${th} w-14`}>S/N</th><th scope="col" className={th}>{nameHeading}</th>
            {headings.map((h) => <th key={h} scope="col" className={th}>{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.map((r, n) => (
              <tr key={r.id} id={r.slug} className="relative border-t border-line transition-colors hover:bg-brand-tint/50">
                <td className={`${td} tabular-nums text-ink-muted`}>{from + n}</td>
                <td className={td}>
                  <span className="flex items-center gap-3">
                    <Face r={r} />
                    {/* The link's ::after covers the row, so a tap anywhere on it opens the page */}
                    <Link href={r.href} className="font-display text-[14px] font-bold text-heading after:absolute after:inset-0 hover:text-brand">{r.name}</Link>
                  </span>
                </td>
                {headings.map((h, i) => <td key={h} className={`${td} ${i === 0 ? "font-medium text-heading" : ""}`}>{r.cells[i] || "—"}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ol className="flex flex-col gap-3 md:hidden">
        {rows.map((r, n) => (
          <li key={r.id} className="relative flex flex-col gap-3 rounded-2xl border border-line bg-white p-4">
            <span className="flex items-center gap-3">
              <Face r={r} />
              <span className="flex min-w-0 flex-1 flex-col">
                <Link href={r.href} className="font-display text-[15px] font-bold leading-snug text-heading after:absolute after:inset-0">{r.name}</Link>
                {r.sub ? <span className="text-[13px] text-ink-soft">{r.sub}</span> : null}
              </span>
              <span className="self-start text-[12px] tabular-nums text-ink-muted">{from + n}</span>
            </span>
            <dl className="grid grid-cols-[96px_minmax(0,1fr)] gap-x-3 gap-y-1.5 border-t border-line pt-3 text-[13px]">
              {headings.map((h, i) => r.cells[i] && r.cells[i] !== r.sub ? <Fragment key={h}><dt className="text-ink-muted">{h}</dt><dd className="text-heading">{r.cells[i]}</dd></Fragment> : null)}
            </dl>
          </li>
        ))}
      </ol>
    </>
  );
}

/** The photo or logo, or the initials. */
function Face({ r }: { r: TableRow }) {
  return (
    <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-brand-tint text-[12px] font-bold text-brand">
      {/* eslint-disable-next-line @next/next/no-img-element -- uploaded or editor-entered address */}
      {r.photo ? <img src={r.photo} alt="" loading="lazy" className="h-full w-full object-cover" /> : r.name.split(/ +/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
    </span>
  );
}

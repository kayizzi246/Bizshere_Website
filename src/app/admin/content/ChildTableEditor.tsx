import type { ContentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { date } from "@/lib/format";
import { delegate, tablesFor, type ChildField, type ChildTable, type ParentIds } from "@/lib/child-tables";
import { parentIds, refInclude, refLabel, refOptions } from "@/lib/child-data";
import { deleteChildRow, saveChildRow } from "./child-table-actions";
import { UploadButton } from "@/components/UploadButton";

/**
 * Editors for every child table of this directory (src/lib/child-tables.ts): a row list
 * where each row opens to edit or delete, and an "Add" form. Display-only tables are
 * edited elsewhere and left out here.
 */
type Row = Record<string, unknown>;
type Options = Record<string, { value: string; label: string }[]>;

export async function ChildTableEditor({ contentItemId, type }: { contentItemId: string; type: ContentType }) {
  const p = await parentIds(contentItemId);
  if (!p) return null;
  const tables = tablesFor(type).filter((x) => !x.displayOnly);
  const loaded = await Promise.all(tables.map(async (table) => {
    const scope = table.scope(p);
    const rows = scope ? await delegate(prisma, table.model).findMany({ where: scope, orderBy: table.orderBy, include: refInclude(table.fields) }) : null;
    const options: Options = {};
    for (const f of table.fields) if (f.kind === "ref") options[f.name] = await refOptions(f.ref!, p);
    return { table, rows, options };
  }));

  return (
    <div className="flex flex-col gap-5">
      {loaded.map(({ table, rows, options }) => (
        <section key={table.key} id={`t-${table.key}`} className="flex scroll-mt-20 flex-col gap-4 rounded-2xl border border-line bg-surface p-4 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-base font-extrabold text-heading">{table.label}</h2>
              <p className="text-[13px] text-ink-muted">{table.intro ?? (table.adminOnly ? "Not shown on the public page." : "Shown on the public page.")}</p>
            </div>
            {rows ? <span className="text-xs text-ink-muted">{rows.length} {rows.length === 1 ? table.item : `${table.item}s`}</span> : null}
          </div>

          {rows === null ? (
            <p className="rounded-lg bg-warn-bg p-3 text-sm text-warn-fg">Link this record to an organization first (Organization section above), then add {table.label.toLowerCase()}.</p>
          ) : (
            <>
              {rows.length ? (
                <ul className="flex flex-col divide-y divide-line rounded-lg border border-line">
                  {rows.map((row) => (
                    <li key={String(row.id)}>
                      <details className="group [&_summary::-webkit-details-marker]:hidden">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 hover:bg-page">
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate text-sm font-semibold text-ink">{heading(table, row)}</span>
                            <span className="truncate text-xs text-ink-muted">{summary(table, row)}</span>
                          </span>
                          <span className="shrink-0 text-xs font-semibold text-brand group-open:hidden">Edit</span>
                          <span className="hidden shrink-0 text-xs font-semibold text-ink-muted group-open:inline">Close</span>
                        </summary>
                        <div className="border-t border-line bg-page/60 p-4">
                          <RowForm table={table} p={p} contentItemId={contentItemId} row={row} options={options} />
                          <form action={deleteChildRow} className="mt-3 flex justify-end">
                            <input type="hidden" name="contentItemId" value={contentItemId} />
                            <input type="hidden" name="table" value={table.key} />
                            <input type="hidden" name="rowId" value={String(row.id)} />
                            <button className="text-xs font-semibold text-bad-fg hover:underline">Delete this {table.item}</button>
                          </form>
                        </div>
                      </details>
                    </li>
                  ))}
                </ul>
              ) : null}
              <details className="group rounded-lg border border-dashed border-line-strong [&_summary::-webkit-details-marker]:hidden">
                <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-brand">+ Add {table.item}</summary>
                <div className="border-t border-line p-4">
                  <RowForm table={table} p={p} contentItemId={contentItemId} options={options} />
                </div>
              </details>
            </>
          )}
        </section>
      ))}
    </div>
  );
}

function RowForm({ table, contentItemId, row, options }: { table: ChildTable; p: ParentIds; contentItemId: string; row?: Row; options: Options }) {
  return (
    <form action={saveChildRow} className="flex flex-col gap-3">
      <input type="hidden" name="contentItemId" value={contentItemId} />
      <input type="hidden" name="table" value={table.key} />
      {row ? <input type="hidden" name="rowId" value={String(row.id)} /> : null}
      <div className="flex flex-wrap gap-3">
        {table.fields.map((f) => <Input key={f.name} f={f} value={row ? formValue(f, row[f.name]) : defaultValue(f)} options={options[f.name]} />)}
      </div>
      <div className="flex justify-end"><button className="btn-primary min-h-[44px] px-5">{row ? "Save changes" : `Add ${table.item}`}</button></div>
    </form>
  );
}

function Input({ f, value, options }: { f: ChildField; value: string; options?: { value: string; label: string }[] }) {
  const name = `c_${f.name}`;
  const label = `${f.label}${f.required ? " *" : ""}${f.member ? " · members only" : ""}`;
  const help = f.help ? <span className="text-xs font-normal text-ink-muted">{f.help}</span> : null;
  if (f.kind === "textarea" || f.kind === "json") {
    return (
      <label className="label flex-[1_1_100%] text-[13px]">{label}
        <textarea name={name} defaultValue={value} rows={f.kind === "json" ? 3 : 3} className={`input py-2 text-sm ${f.kind === "json" ? "font-mono" : ""}`} />{help}
      </label>
    );
  }
  const choices = f.kind === "bool" ? [{ value: "", label: "Unknown" }, { value: "true", label: "Yes" }, { value: "false", label: "No" }]
    : f.kind === "enum" ? [{ value: "", label: "Choose…" }, ...(f.options ?? []).map((o) => ({ value: o, label: o.replace(/_/g, " ").toLowerCase() }))]
    : f.kind === "ref" ? [{ value: "", label: f.required ? "Choose…" : "None" }, ...(options ?? [])]
    : null;
  if (f.upload) {
    return (
      <div className="flex min-w-0 flex-[1_1_100%] flex-col gap-2">
        <label className="label min-w-0 text-[13px]">{label}
          <input name={name} defaultValue={value} type="text" className="input min-h-[44px] w-full min-w-0 text-sm" placeholder="Paste a link, or upload below" />
        </label>
        <UploadButton target={name} kind={f.upload} />
      </div>
    );
  }
  return (
    <label className="label min-w-0 flex-[1_1_200px] text-[13px]">{label}
      {choices ? (
        <select name={name} defaultValue={value} className="input min-h-[44px] w-full min-w-0 text-sm">{choices.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
      ) : (
        <input name={name} defaultValue={value} type={f.kind === "date" ? "date" : "text"} inputMode={f.kind === "int" || f.kind === "decimal" ? "decimal" : undefined} className="input min-h-[44px] w-full min-w-0 text-sm" />
      )}
      {help ?? (f.kind === "list" ? <span className="text-xs font-normal text-ink-muted">Comma-separated</span> : null)}
    </label>
  );
}

const defaultValue = (f: ChildField) => (f.name === "status" ? "PUBLISHED" : f.name === "accessLevel" ? "PUBLIC" : f.name === "moderation" ? "PENDING" : f.name === "currency" ? "UGX" : "");

function formValue(f: ChildField, v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (Array.isArray(v)) return v.join(", ");
  if (f.kind === "json") return JSON.stringify(v);
  return String(v);
}

function heading(table: ChildTable, row: Row) {
  const f = table.fields.find((x) => x.name === table.heading);
  if (f?.kind === "ref") return refLabel(f, row)?.label ?? "—";
  if (table.key === "reviews") return `${row.rating} / 5`;
  const v = row[table.heading];
  return v ? String(v).slice(0, 90) : `Untitled ${table.item}`;
}

/** Two or three filled values after the heading, for the collapsed row. */
function summary(table: ChildTable, row: Row) {
  return table.fields
    .filter((f) => f.name !== table.heading && f.kind !== "textarea" && f.kind !== "json" && row[f.name] !== null && row[f.name] !== undefined && row[f.name] !== "")
    .slice(0, 3)
    .map((f) => {
      const v = row[f.name];
      if (f.kind === "ref") return refLabel(f, row)?.label ?? "";
      if (v instanceof Date) return `${f.label} ${date(v)}`;
      if (typeof v === "boolean") return v ? f.label : "";
      return `${f.label}: ${Array.isArray(v) ? v.join(", ") : String(v).replace(/_/g, " ").toLowerCase()}`;
    })
    .filter(Boolean)
    .join(" · ");
}

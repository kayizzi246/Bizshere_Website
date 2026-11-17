"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Download, FileSpreadsheet, Loader2, TriangleAlert, Upload } from "lucide-react";
import { columnsFor, draftsFromRows, IMPORT_KINDS, MAX_ROWS, parseCsv, type ImportDraft, type ImportKind } from "@/lib/bulk-import";
import { importRows, type ImportResult } from "./actions";

/**
 * Importing a spreadsheet of business ideas, suppliers or experts.
 *
 * Three steps, deliberately: choose what you are importing, check what was read, then save. The
 * file is read in the browser and nothing is written until Save is pressed, so a column landing in
 * the wrong place is something you see rather than something you discover later in the live site.
 */
export function ImportClient({ allowed }: { allowed: ImportKind[] }) {
  const [kind, setKind] = useState<ImportKind>(allowed[0]);
  const [drafts, setDrafts] = useState<ImportDraft[]>([]);
  const [fileName, setFileName] = useState("");
  const [notice, setNotice] = useState("");
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const cols = columnsFor(kind);
  const good = drafts.filter((d) => !d.problems.length);
  const bad = drafts.filter((d) => d.problems.length);

  const reset = () => { setDrafts([]); setFileName(""); setNotice(""); setProblem(""); setResult(null); };

  const read = async (file: File) => {
    setProblem(""); setNotice(""); setResult(null);
    try {
      const name = file.name.toLowerCase();
      let table: unknown[][];
      if (name.endsWith(".csv") || file.type === "text/csv") table = parseCsv(await file.text());
      else if (name.endsWith(".xlsx")) {
        const { readSheet } = await import("read-excel-file/browser");
        table = (await readSheet(file)) as unknown[][];
      } else if (name.endsWith(".xls")) {
        throw new Error("This is an old Excel file (.xls). In Excel choose File → Save As → Excel Workbook (.xlsx), or CSV, then import that.");
      } else throw new Error("Choose an Excel file (.xlsx) or a CSV file.");

      const { drafts: read, skipped, error } = draftsFromRows(kind, table);
      if (error) throw new Error(error);
      setDrafts(read);
      setFileName(file.name);
      setNotice(`${read.length} row${read.length === 1 ? "" : "s"} read from ${file.name}${skipped ? `, ${skipped} without a name left out` : ""}. Check them below, then save.`);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "That file could not be read.");
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const template = () => {
    // Imported with a byte-order mark so Excel opens it as UTF-8 and keeps any accents.
    import("@/lib/bulk-import").then(({ templateCsv }) => {
      const url = URL.createObjectURL(new Blob(["﻿" + templateCsv(kind)], { type: "text/csv" }));
      const a = Object.assign(document.createElement("a"), { href: url, download: `${kind.toLowerCase()}-template.csv` });
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const save = async () => {
    setBusy(true); setProblem("");
    try {
      const r = await importRows(kind, good.map((d) => d.values));
      setResult(r);
      if (r.error) setProblem(r.error);
      else { setDrafts(bad); setNotice(""); }
    } catch {
      setProblem("The rows could not be saved. Nothing was changed.");
    } finally { setBusy(false); }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 1. What is being imported */}
      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 sm:p-6">
        <h2 className="font-display text-[15px] font-bold text-heading">1. What are you importing?</h2>
        <div className="flex flex-wrap gap-2">
          {allowed.map((k) => (
            <button key={k} type="button" onClick={() => { setKind(k); reset(); }}
              className={`rounded-full border-2 px-4 py-1.5 text-[13px] font-semibold transition-colors ${k === kind ? "border-brand bg-brand-tint text-brand-dark" : "border-transparent bg-page text-ink-soft hover:bg-line/40"}`}>
              {IMPORT_KINDS[k]}
            </button>
          ))}
        </div>
        <p className="text-[13px] text-ink-soft">
          The first row of the sheet must name the columns. Order does not matter and extra columns are ignored.
          Only <strong className="font-semibold text-heading">Name</strong> is required.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={template} className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-[13px] font-semibold text-heading hover:bg-page">
            <Download className="h-4 w-4" />Download the template
          </button>
          <button type="button" onClick={() => fileInput.current?.click()} className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-3 text-[13px] font-semibold text-white hover:bg-brand-deep">
            <Upload className="h-4 w-4" />Choose a file
          </button>
          <input ref={fileInput} type="file" className="sr-only" tabIndex={-1} aria-hidden
            accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => e.target.files?.[0] && read(e.target.files[0])} />
          {fileName ? <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted"><FileSpreadsheet className="h-4 w-4" />{fileName}</span> : null}
        </div>
        <details className="text-[13px] text-ink-soft">
          <summary className="cursor-pointer font-semibold text-heading">Columns it understands</summary>
          <ul className="mt-2 flex flex-col gap-1">
            {cols.map((c) => (
              <li key={c.field}>
                <strong className="font-semibold text-heading">{c.heading}</strong>
                {c.required ? <span className="ml-1 text-[12px] font-semibold text-bad-fg">required</span> : null}
                {c.note ? <span className="text-ink-muted"> — {c.note}</span> : null}
              </li>
            ))}
          </ul>
        </details>
      </section>

      {problem ? (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-bad-bg px-4 py-3 text-[13px] font-medium text-bad-fg">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />{problem}
        </p>
      ) : null}

      {result && !result.error ? (
        <div role="status" className="flex flex-col gap-2 rounded-lg bg-brand-tint px-4 py-3 text-[13px] text-brand-dark">
          <p className="font-semibold">{result.saved} saved as drafts. They are in the directory now, not on the public site until published.</p>
          {result.failed.length ? (
            <div>
              <p className="font-semibold text-bad-fg">{result.failed.length} could not be saved:</p>
              <ul className="mt-1 flex flex-col gap-0.5 text-bad-fg">
                {result.failed.map((f, i) => <li key={i}>{f.title} — {f.reason}</li>)}
              </ul>
            </div>
          ) : null}
          <Link href="/admin/content" className="font-semibold underline underline-offset-4">Open the directory</Link>
        </div>
      ) : null}

      {/* 2. Check */}
      {drafts.length ? (
        <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-[15px] font-bold text-heading">2. Check what was read</h2>
            <p className="text-[13px] text-ink-soft">
              <strong className="font-semibold text-heading">{good.length}</strong> ready
              {bad.length ? <> · <strong className="font-semibold text-bad-fg">{bad.length}</strong> with a problem</> : null}
            </p>
          </div>
          {notice ? <p className="text-[13px] text-ink-soft">{notice}</p> : null}
          {drafts.length >= MAX_ROWS ? <p className="text-[13px] text-warn-fg">Only the first {MAX_ROWS} rows are imported at a time. Import the rest as a second file.</p> : null}

          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[640px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-line text-left text-[12px] uppercase tracking-wide text-ink-muted">
                  {cols.slice(0, 6).map((c) => <th key={c.field} className="py-2 pr-3 font-semibold">{c.heading}</th>)}
                  <th className="py-2 font-semibold">Problem</th>
                </tr>
              </thead>
              <tbody>
                {drafts.map((d) => (
                  <tr key={d.key} className={`border-b border-line/60 ${d.problems.length ? "bg-bad-bg/40" : ""}`}>
                    {cols.slice(0, 6).map((c) => (
                      <td key={c.field} className="max-w-[220px] truncate py-2 pr-3 text-heading">{d.values[c.field] ?? ""}</td>
                    ))}
                    <td className="py-2 text-bad-fg">{d.problems.join("; ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={save} disabled={busy || !good.length}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-accent px-5 font-display text-[14px] font-bold text-[#1F2328] hover:bg-accent-dark hover:text-white disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {busy ? "Saving…" : `Save ${good.length} as drafts`}
            </button>
            <button type="button" onClick={reset} className="h-11 rounded-lg px-3 text-[13px] font-semibold text-ink-soft hover:text-heading">Start again</button>
            {bad.length ? <span className="text-[13px] text-ink-muted">Rows with a problem are not saved. Fix them in the sheet and import it again.</span> : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

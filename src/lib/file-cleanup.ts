import { del } from "@vercel/blob";
import { deleteStoredFile, listStoredFiles, storedKey, UPLOAD_PATH } from "./storage";

/**
 * Removes files from storage when the record that pointed at them goes away or is replaced.
 * Covers both places files can live: this server's own disk (UPLOAD_DIR) and Vercel Blob.
 *
 * Without this, every photo and document ever uploaded stays in the blob store for good:
 * a file picked and then abandoned, a photo swapped for a better one, a deleted product —
 * all of it keeps costing storage with nothing linking to it.
 *
 * Safe to call with anything: nulls, empty strings, links to other sites and local
 * development paths are all ignored, and a failure never interrupts what the person was
 * doing — a file left behind is a smaller problem than a delete that appears to fail.
 *
 * Uploads are stored with `addRandomSuffix: true`, so each upload has its own address and
 * no two records share one. The exception is an editor pasting the same address into a
 * second record by hand; `stillUsed` guards the cases where that is plausible.
 */

type Files = (string | null | undefined)[];

/** Only our own blob store. Links to other sites are not ours to delete. */
const ours = (url: string) => /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i.test(url);

export function discardFiles(...urls: (string | null | undefined)[]) {
  const all = [...new Set(urls.flat().filter((u): u is string => typeof u === "string" && Boolean(u)))];

  // Files on this server's own disk (UPLOAD_DIR).
  for (const key of all.map(storedKey)) if (key) void deleteStoredFile(key);

  // Files in Vercel Blob.
  const blobs = all.filter(ours);
  // Not awaited: the person's save or delete should not wait on storage, nor fail with it.
  if (blobs.length && process.env.BLOB_READ_WRITE_TOKEN) void del(blobs).catch(() => undefined);
}

/** The files a record pointed at, for discarding once it is gone. */
export const filesOf = (record: { imageUrl?: string | null; fileUrl?: string | null; moreImages?: string[] | null } | null | undefined) =>
  record ? [record.imageUrl, record.fileUrl, ...(record.moreImages ?? [])] : [];

/** Of `before`, the files `after` no longer points at. */
export const filesDropped = (before: Files, after: Files) => {
  const kept = new Set(after.filter(Boolean));
  return before.filter((u): u is string => Boolean(u) && !kept.has(u));
};

/**
 * Every address in the blob store that no row in the database points at any more.
 *
 * Rather than listing the columns that hold files — a list that would fall out of date with
 * the next migration and, when it did, delete a file still in use — this reads the column
 * names from the database itself and searches every text and text-list column in the public
 * schema. A new column holding uploads is covered the day it is added.
 */
async function referencedUrls(db: {
  $queryRawUnsafe: <T>(sql: string, ...args: unknown[]) => Promise<T>;
}): Promise<Set<string>> {
  const columns = await db.$queryRawUnsafe<{ table_name: string; column_name: string; data_type: string }[]>(`
    select c.table_name, c.column_name, c.data_type
    from information_schema.columns c
    join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public' and t.table_type = 'BASE TABLE'
      and (c.data_type in ('text', 'character varying') or (c.data_type = 'ARRAY' and c.udt_name in ('_text', '_varchar')))`);

  const quote = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const parts = columns.map(({ table_name, column_name, data_type }) => {
    const col = `${quote(table_name)}.${quote(column_name)}`;
    return data_type === "ARRAY"
      ? `select unnest(${col}) as v from ${quote(table_name)}`
      : `select ${col} as v from ${quote(table_name)}`;
  });
  if (!parts.length) return new Set();

  const rows = await db.$queryRawUnsafe<{ v: string }[]>(
    `select distinct v from (${parts.join(" union all ")}) all_values
     where v like 'https://%.public.blob.vercel-storage.com/%' or v like '${UPLOAD_PATH}%'`,
  );
  return new Set(rows.map((r) => r.v));
}

/**
 * Deletes files in the blob store that nothing points at and that are older than `graceHours`
 * (a file just uploaded may still be sitting in a form the editor has not saved yet).
 *
 * This is the backstop for the cases the save and delete handlers cannot catch: a file chosen
 * and then abandoned without saving, and records deleted through a cascade, where the row holding
 * the address is gone before any code sees it.
 */
export async function sweepOrphanFiles(
  db: Parameters<typeof referencedUrls>[0],
  { graceHours = 48, dryRun = false }: { graceHours?: number; dryRun?: boolean } = {},
) {
  const kept = await referencedUrls(db);
  const before = Date.now() - graceHours * 3600_000;

  // ── This server's own disk (Coolify, Railway, a VPS) ──
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    const files = await listStoredFiles();
    const orphans = files.filter((f) => !kept.has(UPLOAD_PATH + encodeURIComponent(f.key)) && f.modified < before);
    const bytes = orphans.reduce((n, o) => n + o.size, 0);
    if (!dryRun) for (const o of orphans) await deleteStoredFile(o.key);
    return { checked: files.length, deleted: orphans.length, bytes, skipped: null as string | null };
  }

  const { list } = await import("@vercel/blob");
  const orphans: { url: string; size: number }[] = [];
  let checked = 0;
  let cursor: string | undefined;

  do {
    const page = await list({ cursor, limit: 1000 });
    for (const b of page.blobs) {
      checked++;
      if (kept.has(b.url)) continue;
      if (new Date(b.uploadedAt).getTime() > before) continue; // too new to judge
      orphans.push({ url: b.url, size: b.size });
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  const bytes = orphans.reduce((n, o) => n + o.size, 0);
  if (!dryRun && orphans.length) {
    const { del } = await import("@vercel/blob");
    // In batches: one very long request is more likely to time out than several short ones.
    for (let i = 0; i < orphans.length; i += 100) await del(orphans.slice(i, i + 100).map((o) => o.url));
  }
  return { checked, deleted: orphans.length, bytes, skipped: null as string | null };
}

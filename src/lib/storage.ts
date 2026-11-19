import path from "node:path";
import { promises as fs } from "node:fs";

/**
 * Private file storage. Files live under UPLOAD_DIR (default ./uploads, git-ignored)
 * and are only ever served through /api/files/[id] after an access check.
 *
 * To move to S3-compatible storage later, replace readStoredFile() and keep the
 * same `fileLocation` keys in the database.
 */
const ROOT = path.resolve(process.env.UPLOAD_DIR ?? "uploads");

/** Resolves a stored key to an absolute path, refusing anything outside ROOT. */
export function resolveStoredPath(key: string) {
  const full = path.resolve(ROOT, key);
  if (full !== ROOT && !full.startsWith(ROOT + path.sep)) throw new Error("Invalid file key");
  return full;
}

export async function readStoredFile(key: string) {
  return fs.readFile(resolveStoredPath(key));
}

export const isExternal = (location: string) => /^https?:\/\//i.test(location);

/**
 * Where a file uploaded to this server's own disk is served from. Not /uploads, which would be
 * public/: that folder lives inside the image and is replaced on every deploy. These come off
 * the persistent volume (UPLOAD_DIR) through src/app/api/uploads/[...path]/route.ts.
 */
export const UPLOAD_PATH = "/api/uploads/";

/** True for an address this server keeps on its own disk. */
export const isStored = (location: string) => location.startsWith(UPLOAD_PATH);

/** The storage key behind such an address, or null if it is not one of ours. */
export const storedKey = (location: string) =>
  isStored(location) ? decodeURIComponent(location.slice(UPLOAD_PATH.length).split(/[?#]/)[0] ?? "") : null;

/** Saves bytes under UPLOAD_DIR and returns the address to store and link to. */
export async function writeStoredFile(name: string, body: Buffer) {
  const full = resolveStoredPath(name);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, body);
  return UPLOAD_PATH + encodeURIComponent(name);
}

/** Removes a stored file. One that has already gone is not an error. */
export async function deleteStoredFile(key: string) {
  await fs.unlink(resolveStoredPath(key)).catch(() => undefined);
}

/** Every file in storage, for finding the ones nothing points at any more. */
export async function listStoredFiles() {
  const out: { key: string; size: number; modified: number }[] = [];
  const walk = async (dir: string, prefix: string) => {
    for (const e of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
      const key = prefix + e.name;
      if (e.isDirectory()) await walk(path.join(dir, e.name), key + "/");
      else {
        const st = await fs.stat(path.join(dir, e.name)).catch(() => null);
        if (st) out.push({ key, size: st.size, modified: st.mtimeMs });
      }
    }
  };
  await walk(ROOT, "");
  return out;
}

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

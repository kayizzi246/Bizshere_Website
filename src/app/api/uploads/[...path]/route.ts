import { NextResponse } from "next/server";
import { readStoredFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Serves photos and documents uploaded to this server's own disk (UPLOAD_DIR), for deployments
 * that have no Vercel Blob: Coolify, Railway, a VPS. public/uploads cannot be used, because
 * public/ is built into the image and a deploy would take every uploaded file with it.
 *
 * These are the addresses stored in the content forms' picture and file fields, so they are as
 * public as the pages that show them. Files that are only for members go through
 * /api/files/[id] instead, which checks who is asking first.
 *
 * resolveStoredPath() refuses any key that resolves outside UPLOAD_DIR, so "../../etc/passwd"
 * cannot be read however it is encoded.
 */
const TYPES: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif",
  pdf: "application/pdf", csv: "text/csv",
  doc: "application/msword", xls: "application/vnd.ms-excel",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

export async function GET(_req: Request, { params }: { params: { path: string[] } }) {
  const key = params.path.map(decodeURIComponent).join("/");
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  const type = TYPES[ext];
  // Only the kinds of file the upload route accepts are served back.
  if (!type) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: Buffer;
  try {
    body = await readStoredFile(key);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": type,
      "Content-Length": String(body.length),
      // Every upload is saved under its own random name, so a given address never changes.
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FILE_TYPES, MAX_CLOUD_BYTES, MAX_LOCAL_BYTES } from "@/lib/uploads";
import { allow, LIMITS } from "@/lib/rate-limit";
import { writeStoredFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Admin uploads (images and PDFs/documents) for the content forms, and suppliers' product photos.
 *
 * Two ways, chosen by whether BLOB_READ_WRITE_TOKEN is set:
 *
 *   Vercel Blob (BLOB_READ_WRITE_TOKEN set): the browser uploads straight to Blob storage and
 *   this route only hands out a short-lived token, so the file never passes through the server
 *   and the 4.5 MB request limit does not apply.
 *
 *   This server's own disk (no token): the file is posted here and saved under UPLOAD_DIR, which
 *   on Coolify, Railway or a VPS is a persistent volume. It is served back by
 *   /api/uploads/[...path]. Not public/uploads: public/ is inside the image, so a deploy would
 *   take every uploaded file with it.
 */
const cloud = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
// Staff; sellers adding photos to their own catalog in /supplier (members of a supplier organisation);
// and experts adding photos and files of their work in /expert (owners of an expert profile).
const isStaff = async (): Promise<string | null> => {
  const s = await getSession();
  if (!s?.user) return null;
  if (["EDITOR", "ADMIN"].includes(s.user.role)) return s.user.id;
  const [seller, expert] = await Promise.all([
    prisma.organizationMember.findFirst({ where: { userId: s.user.id, organization: { supplier: { isNot: null } } }, select: { userId: true } }),
    prisma.consultant.findUnique({ where: { ownerId: s.user.id }, select: { id: true } }),
  ]);
  return seller || expert ? s.user.id : null;
};

/**
 * May this person upload one more file now? Staff and sellers are trusted, but each account is
 * held to a ceiling an hour: a 50 MB cap per file is no protection on its own when nothing
 * limits how many files an account may send.
 */
const mayUpload = async () => {
  const userId = await isStaff();
  if (!userId) return { ok: false as const, error: "Not allowed", status: 403 };
  const [max, window] = LIMITS.uploadPerUser;
  if (!(await allow(`upload:user:${userId}`, max, window))) {
    return { ok: false as const, error: "That is a lot of files at once. Please wait a few minutes and carry on.", status: 429 };
  }
  return { ok: true as const, userId };
};

/** Which way the upload button should send the file. */
export async function GET() {
  if (!(await isStaff())) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const mode = cloud() ? "cloud" : "local";
  return NextResponse.json({ mode });
}

export async function POST(req: NextRequest) {
  // ── Cloud: token exchange and upload-finished callback from Vercel Blob ──
  if (cloud()) {
    try {
      const body = (await req.json()) as HandleUploadBody;
      const result = await handleUpload({
        body,
        request: req,
        onBeforeGenerateToken: async () => {
          // Called by our own upload button, with the editor's session cookie.
          const may = await mayUpload();
          if (!may.ok) throw new Error(may.error);
          return { allowedContentTypes: FILE_TYPES, maximumSizeInBytes: MAX_CLOUD_BYTES, addRandomSuffix: true };
        },
        // Called by Vercel when the upload finishes; the URL is saved when the editor saves the form.
        onUploadCompleted: async () => {},
      });
      return NextResponse.json(result);
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 400 });
    }
  }

  // ── This server's own disk (UPLOAD_DIR) ──
  const may = await mayUpload();
  if (!may.ok) return NextResponse.json({ error: may.error }, { status: may.status });
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!FILE_TYPES.includes(file.type)) return NextResponse.json({ error: "Only images, PDFs and Office documents can be uploaded." }, { status: 415 });
  if (file.size > MAX_LOCAL_BYTES) return NextResponse.json({ error: "File is larger than 20 MB." }, { status: 413 });

  const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "").slice(-60) || "file";
  // A random name, so no two uploads collide and a stored address never changes meaning.
  const name = `${randomBytes(6).toString("hex")}-${safe}`;
  try {
    return NextResponse.json({ url: await writeStoredFile(name, Buffer.from(await file.arrayBuffer())) });
  } catch {
    return NextResponse.json({ error: "The file could not be saved. Check that UPLOAD_DIR points at a writable volume." }, { status: 500 });
  }
}

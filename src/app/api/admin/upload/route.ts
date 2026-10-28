import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getSession } from "@/lib/auth";
import { FILE_TYPES, MAX_CLOUD_BYTES, MAX_LOCAL_BYTES } from "@/lib/uploads";

export const dynamic = "force-dynamic";

/**
 * Admin uploads (images and PDFs/documents) for the content forms.
 *
 * With BLOB_READ_WRITE_TOKEN set (Vercel → Storage → Blob), the browser uploads straight to
 * Vercel Blob: this route only hands out a short-lived upload token, after checking that the
 * person is staff, and the file never passes through the server (no 4.5 MB request limit).
 * Without it, in local development only, files are saved to public/uploads/.
 */
const cloud = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const isStaff = async () => {
  const s = await getSession();
  return Boolean(s?.user && ["EDITOR", "ADMIN"].includes(s.user.role));
};

/** Which way the upload button should send the file. */
export async function GET() {
  if (!(await isStaff())) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const mode = cloud() ? "cloud" : process.env.NODE_ENV !== "production" ? "local" : "off";
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
          if (!(await isStaff())) throw new Error("Not allowed");
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

  // ── Local development fallback ──
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Uploads need Vercel Blob. In Vercel, open Storage → Create → Blob and connect it to this project." }, { status: 501 });
  }
  if (!(await isStaff())) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!FILE_TYPES.includes(file.type)) return NextResponse.json({ error: "Only images, PDFs and Office documents can be uploaded." }, { status: 415 });
  if (file.size > MAX_LOCAL_BYTES) return NextResponse.json({ error: "File is larger than 20 MB." }, { status: 413 });

  const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "").slice(-60) || "file";
  const name = `${randomBytes(6).toString("hex")}-${safe}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ url: `/uploads/${name}` });
}

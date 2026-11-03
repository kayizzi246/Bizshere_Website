import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 30 * 1024 * 1024;

/**
 * GET /guides/[slug]/file: the guide's PDF from our own address, so the guide page can show it
 * in its viewer (browsers won't frame other sites' files) and offer a download (?download=1).
 * Same rule as the page's download button: members, or everyone when the guide is public.
 * Only PDFs; the file comes from public/ (uploads) or is fetched from its https address.
 */
export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const viewer = await getViewer();
  const item = await prisma.contentItem.findFirst({
    where: { slug: params.slug, contentType: "GUIDE", publicationStatus: viewer.isStaff ? undefined : "PUBLISHED" },
    include: { guide: { select: { downloadUrl: true } } },
  });
  const src = item?.guide?.downloadUrl;
  if (!item || !src) return new Response("Not found", { status: 404 });
  if (item.accessLevel !== "PUBLIC" && !viewer.isMember) return new Response("Members only", { status: 403 });

  let bytes: Buffer | null = null;
  try {
    if (src.startsWith("/")) {
      const root = path.join(process.cwd(), "public");
      const file = path.join(root, path.normalize(src).replace(/^([/\\])+/, ""));
      if (file.startsWith(root) && /\.pdf$/i.test(file)) bytes = await readFile(file);
    } else if (/^https:\/\//.test(src)) {
      const res = await fetch(src, { signal: AbortSignal.timeout(15000) });
      const type = res.headers.get("content-type") ?? "";
      const size = Number(res.headers.get("content-length") ?? 0);
      if (res.ok && /application\/pdf/i.test(type) && size <= MAX_BYTES) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length <= MAX_BYTES) bytes = buf;
      }
    }
  } catch {
    bytes = null;
  }
  // Not a PDF we can show: send the visitor to the original address instead.
  if (!bytes || bytes.subarray(0, 5).toString() !== "%PDF-") return Response.redirect(src.startsWith("/") ? new URL(src, req.url) : src, 302);

  const download = new URL(req.url).searchParams.has("download");
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${item.slug}.pdf"`,
    },
  });
}

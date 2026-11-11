import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { isExternal, readStoredFile } from "@/lib/storage";
import { pdfResponse } from "@/lib/pdf-file";

/**
 * Serves downloadable files after a server-side access check (blueprint 17:
 * "enforce access on the server, including file downloads").
 * Never link to storage directly from pages.
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const viewer = await getViewer();
  const asset = await prisma.mediaAsset.findUnique({
    where: { id: params.id },
    include: { contentItem: { select: { publicationStatus: true } }, versions: { where: { isCurrent: true }, take: 1 } },
  });
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (asset.contentItem && asset.contentItem.publicationStatus !== "PUBLISHED" && !viewer.isStaff) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (asset.accessLevel !== "PUBLIC" && !viewer.isMember) {
    return NextResponse.json({ error: "Members only" }, { status: viewer.userId ? 403 : 401 });
  }

  const current = asset.versions[0];
  const location = current?.fileLocation ?? asset.fileLocation;
  await prisma.usageEvent.create({ data: { userId: viewer.userId, event: "download", contentItemId: asset.contentItemId, details: { assetId: asset.id, version: current?.versionLabel ?? null } } }).catch(() => undefined);

  // ?inline=1: a PDF to read on the site before downloading (src/components/PdfViewer.tsx)
  const inline = new URL(req.url).searchParams.has("inline");

  if (isExternal(location)) {
    // External links are only allowed for public files, otherwise the URL would leak.
    if (asset.accessLevel !== "PUBLIC") return NextResponse.json({ error: "Protected files must be stored privately" }, { status: 500 });
    // The on-site reader can only read files from our own address
    if (inline) return pdfResponse(location, req, asset.id);
    return NextResponse.redirect(location);
  }

  try {
    const body = await readStoredFile(location);
    const name = location.split("/").pop() ?? "download";
    const type = current?.mimeType ?? "application/octet-stream";
    return new NextResponse(body, {
      headers: {
        "Content-Type": type,
        "Content-Disposition": `${inline && type === "application/pdf" ? "inline" : "attachment"}; filename="${name.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "File missing" }, { status: 404 });
  }
}

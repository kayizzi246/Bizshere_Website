import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { pdfResponse } from "@/lib/pdf-file";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /guides/[slug]/file: the guide's PDF from our own address, so the guide page can show it
 * in its reader and offer a download (?download=1) (src/lib/pdf-file.ts).
 * Same rule as the page's download button: members, or everyone when the guide is public.
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
  return pdfResponse(src, req, item.slug);
}

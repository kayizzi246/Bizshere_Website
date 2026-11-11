import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { pdfResponse } from "@/lib/pdf-file";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /experts/[slug]/file: the expert's profile (CV or company profile) from our own address,
 * so it can be read on the site before it is downloaded (src/lib/pdf-file.ts). Same rule as the
 * link on the expert's page: members, or everyone when the page is public.
 */
export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const viewer = await getViewer();
  const item = await prisma.contentItem.findFirst({
    where: { slug: params.slug, contentType: "CONSULTANT", publicationStatus: viewer.isStaff ? undefined : "PUBLISHED" },
    include: { consultant: { select: { profileUrl: true } } },
  });
  const src = item?.consultant?.profileUrl;
  if (!item || !src) return new Response("Not found", { status: 404 });
  if (item.accessLevel !== "PUBLIC" && !viewer.isMember) return new Response("Members only", { status: 403 });
  return pdfResponse(src, req, `${item.slug}-profile`);
}

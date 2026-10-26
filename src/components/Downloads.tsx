import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { date } from "@/lib/format";
import { Gate } from "./Gate";

const DOWNLOAD_TYPES = ["document", "template", "manual", "spec_sheet", "pdf", "spreadsheet", "download"];

/**
 * Downloadable files for a content item. Links go through /api/files/[id], which
 * re-checks access on the server; hiding the link here is only for the UI.
 */
export async function Downloads({ contentItemId, viewer }: { contentItemId: string; viewer: Viewer }) {
  const files = await prisma.mediaAsset.findMany({
    where: { contentItemId, mediaType: { in: DOWNLOAD_TYPES } },
    include: { versions: { where: { isCurrent: true }, take: 1 } },
    orderBy: { displayOrder: "asc" },
  });
  if (!files.length) return null;
  const locked = files.some((f) => f.accessLevel !== "PUBLIC") && !viewer.isMember;
  return (
    <div className="flex flex-col gap-2">
      {files.map((f) => {
        const v = f.versions[0];
        const open = f.accessLevel === "PUBLIC" || viewer.isMember;
        return open ? (
          <a key={f.id} href={`/api/files/${f.id}`} className="btn-outline justify-between">
            <span>{f.caption ?? "Download"}</span>
            <span className="text-xs text-ink-muted">{v ? `v${v.versionLabel} · ${date(v.uploadedAt)}` : ""}</span>
          </a>
        ) : null;
      })}
      {locked ? <Gate compact button="Download" modalTitle="Subscribe for downloads and templates" /> : null}
    </div>
  );
}

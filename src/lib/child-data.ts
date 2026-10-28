import { prisma } from "./prisma";
import type { ChildField, ParentIds, RefKind } from "./child-tables";

/**
 * Server helpers for the child tables in child-tables.ts: which ids a content item's
 * rows hang off, the choices for linked-record fields, and how a link is displayed.
 */

/** The specialised record id (whichever directory this is), the content item id and the supplier's organization. */
export async function parentIds(contentItemId: string): Promise<ParentIds | null> {
  const item = await prisma.contentItem.findUnique({
    where: { id: contentItemId },
    select: {
      id: true,
      businessIdea: { select: { id: true } }, machine: { select: { id: true } }, supplier: { select: { id: true, organizationId: true } },
      fundingProgramme: { select: { id: true } }, investmentOpportunity: { select: { id: true } }, guide: { select: { id: true } },
      consultant: { select: { id: true } }, tool: { select: { id: true } }, website: { select: { id: true } }, news: { select: { id: true } },
    },
  });
  if (!item) return null;
  const rec = item.businessIdea ?? item.machine ?? item.supplier ?? item.fundingProgramme ?? item.investmentOpportunity ?? item.guide ?? item.consultant ?? item.tool ?? item.website ?? item.news;
  return { record: rec?.id ?? "", item: item.id, org: item.supplier?.organizationId ?? null };
}

/** Choices for a linked-record field. Tool versions are limited to this tool. */
export async function refOptions(kind: RefKind, p: ParentIds): Promise<{ value: string; label: string }[]> {
  switch (kind) {
    case "supplier": {
      const rows = await prisma.supplier.findMany({ select: { id: true, contentItem: { select: { title: true } } }, orderBy: { contentItem: { title: "asc" } } });
      return rows.map((r) => ({ value: r.id, label: r.contentItem.title }));
    }
    case "machine": {
      const rows = await prisma.machine.findMany({ select: { id: true, contentItem: { select: { title: true } } }, orderBy: { contentItem: { title: "asc" } } });
      return rows.map((r) => ({ value: r.id, label: r.contentItem.title }));
    }
    case "product": {
      const rows = await prisma.product.findMany({ orderBy: { name: "asc" } });
      return rows.map((r) => ({ value: r.id, label: [r.name, r.variety, r.grade].filter(Boolean).join(", ") }));
    }
    case "district": {
      const rows = await prisma.location.findMany({ where: { type: "DISTRICT" }, orderBy: { name: "asc" } });
      return rows.map((r) => ({ value: r.id, label: r.name }));
    }
    case "toolVersion": {
      const rows = await prisma.toolVersion.findMany({ where: { toolId: p.record }, orderBy: { releasedAt: "desc" } });
      return rows.map((r) => ({ value: r.id, label: `Version ${r.versionNumber}` }));
    }
  }
}

/** Relation loaded with a row so its link can be displayed (field name → Prisma include). */
const RELATION: Record<string, [string, unknown]> = {
  supplierId: ["supplier", { select: { contentItem: { select: { title: true, slug: true } } } }],
  machineId: ["machine", { select: { contentItem: { select: { title: true, slug: true } } } }],
  productId: ["product", true],
  locationId: ["location", true],
  toolVersionId: ["toolVersion", { select: { versionNumber: true } }],
};

export function refInclude(fields: ChildField[]) {
  const inc: Record<string, unknown> = {};
  for (const f of fields) if (f.kind === "ref" && RELATION[f.name]) inc[RELATION[f.name][0]] = RELATION[f.name][1];
  return Object.keys(inc).length ? inc : undefined;
}

/** A linked record's display name and, for directory records, its page. */
export function refLabel(f: ChildField, row: Record<string, unknown>): { label: string; href?: string } | null {
  const rel = RELATION[f.name] ? (row[RELATION[f.name][0]] as Record<string, unknown> | null) : null;
  if (!rel) return null;
  const ci = rel.contentItem as { title: string; slug: string } | undefined;
  if (ci) return { label: ci.title, href: f.ref === "machine" ? `/machines/${ci.slug}` : f.ref === "supplier" ? `/suppliers/${ci.slug}` : undefined };
  if (f.ref === "toolVersion") return { label: `Version ${rel.versionNumber}` };
  return { label: String(rel.name ?? "") };
}

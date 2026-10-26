import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { date, moneyRange } from "@/lib/format";
import { CheckBadges } from "@/components/Checks";
import { ContactCard } from "@/components/ContactCard";
import { Card, Connected, Crumbs, Evidence, Facts, Identity, Prose, Rows, TwoColumn, trackView } from "@/components/DetailParts";

export const dynamic = "force-dynamic";

export default async function ExpertPage({ params }: { params: { slug: string } }) {
  const viewer = await getViewer();
  const item = await prisma.contentItem.findFirst({
    where: { slug: params.slug, contentType: "CONSULTANT", publicationStatus: viewer.isStaff ? undefined : "PUBLISHED" },
    include: {
      checks: { orderBy: { checkedAt: "desc" } },
      consultant: {
        include: {
          organization: true,
          qualifications: true,
          services: true,
          projects: { where: { publicationPermitted: true } },
          reviews: { where: { moderation: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 10 },
          contacts: viewer.isMember ? { orderBy: { isPrimary: "desc" } } : false,
        },
      },
    },
  });
  if (!item?.consultant) notFound();
  const c = item.consultant;
  const path = `/experts/${item.slug}`;
  await trackView(viewer, item.id, path);
  const ratings = c.reviews.map((r) => r.rating);
  const avg = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null;

  return (
    <div className="container-site flex flex-col gap-7 py-6">
      <Crumbs trail={[["/experts", "Experts"]]} title={c.fullName} />
      <Identity eyebrow={`Expert${c.professionalTitle ? ` · ${c.professionalTitle}` : ""}`} title={c.fullName} summary={item.shortSummary}>
        {c.organization ? <span className="text-ink-muted">{c.organization.tradingName ?? c.organization.legalName}</span> : null}
        <CheckBadges checks={item.checks} />
      </Identity>
      <Facts items={[
        ["Specialties", c.specialties.join(", ") || "—"],
        ["Works", c.deliveryModes.join(", ") || "—"],
        ["Languages", c.languages.join(", ") || "—"],
        ["Fees", c.quotationRequired ? "On quotation" : viewer.isMember ? `${moneyRange(c.feeMin, c.feeMax, c.currency, "—")}${c.pricingBasis ? ` ${c.pricingBasis}` : ""}` : "Members"],
      ]} />

      <TwoColumn
        main={<>
          {item.overview || c.experience ? <Card title="Experience"><Prose text={item.overview} /><Prose text={c.experience} /></Card> : null}
          <Card title="Services">
            {c.services.length === 0 ? <p className="text-sm text-ink-muted">Not yet recorded.</p> : c.services.map((s) => (
              <div key={s.id} className="flex flex-col gap-1 border-b border-line py-3 last:border-0">
                <span className="font-bold">{s.name}</span>
                {s.description ? <span className="text-sm text-ink-soft">{s.description}</span> : null}
                <span className="text-xs text-ink-muted">{[s.deliverables && `Deliverables: ${s.deliverables}`, s.deliveryMode, s.coverage].filter(Boolean).join(" · ")}</span>
              </div>
            ))}
          </Card>
          <Card title="Qualifications">
            {c.qualifications.length === 0 ? <p className="text-sm text-ink-muted">Not yet recorded.</p> : (
              <ul className="flex flex-col gap-1.5 text-sm">{c.qualifications.map((q) => <li key={q.id}><strong>{q.qualification}</strong>{q.institution ? `, ${q.institution}` : ""}{q.year ? ` (${q.year})` : ""}{q.professionalBody ? ` · member of ${q.professionalBody}` : ""}</li>)}</ul>
            )}
            <span className="text-xs text-ink-muted">Credential checks are listed at the top of this page with their dates.</span>
          </Card>
          {c.projects.length ? (
            <Card title="Selected projects">
              {c.projects.map((p) => (
                <div key={p.id} className="flex flex-col gap-1 border-b border-line py-3 last:border-0">
                  <span className="font-bold">{p.title}{p.year ? ` (${p.year})` : ""}{p.isCaseStudy ? <span className="badge-info ml-2">Case study</span> : null}</span>
                  {p.clientName ? <span className="text-sm text-ink-muted">Client: {p.clientName}</span> : null}
                  <Prose text={p.summary} />
                  {p.outcome ? <span className="text-sm">Outcome: {p.outcome}</span> : null}
                </div>
              ))}
            </Card>
          ) : null}
          <Card title={`Reviews${avg ? ` · ${avg} / 5 from ${ratings.length}` : ""}`}>
            <p className="text-xs text-ink-muted">Reviews are moderated and kept separate from profile checks.</p>
            {c.reviews.length === 0 ? <p className="text-sm text-ink-muted">No reviews yet.</p> : c.reviews.map((r) => (
              <div key={r.id} className="flex flex-col gap-1 border-b border-line py-3 last:border-0">
                <span className="font-bold">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)} {r.confirmedEngagement ? <span className="badge-ok ml-1">Confirmed client</span> : null}</span>
                <Prose text={r.body} />
                <span className="text-xs text-ink-muted">{date(r.createdAt)}</span>
              </div>
            ))}
          </Card>
        </>}
        aside={<>
          <ContactCard viewer={viewer} contacts={"contacts" in c ? c.contacts : []} name={c.fullName} />
          <Card title="Availability" className="p-6">
            <Rows rows={[["Status", c.availability], ["Usually replies", c.responseTime], ["Consultation", c.consultationMins ? `${c.consultationMins} min` : null]]} />
            {c.bookingUrl && viewer.isMember ? <a href={c.bookingUrl} target="_blank" rel="noreferrer" className="btn-primary">Book or enquire ↗</a> : null}
          </Card>
          <Evidence contentItemId={item.id} lastReviewedAt={item.lastReviewedAt} nextReviewDueAt={item.nextReviewDueAt} viewer={viewer} back={path} />
          <Connected contentItemId={item.id} title="Business ideas and guides" />
        </>}
      />
    </div>
  );
}

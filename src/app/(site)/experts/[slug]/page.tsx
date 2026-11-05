import Link from "next/link";
import { notFound } from "next/navigation";
import { FileDown, Globe, Landmark, Link2, LockKeyhole, Mail, MapPin, Phone, Sparkles, Tag } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { googleEnabled } from "@/lib/auth";
import { cachedMemberPlan } from "@/lib/cached";
import { popupPlan } from "@/lib/billing";
import { trackView } from "@/components/DetailParts";
import { OnboardingGate } from "@/components/Onboarding";
import { ProfileFacts, ProfileTop, type ProfileFact } from "@/components/ProfileTop";
import { RememberVisit } from "@/components/Recent";
import { WishlistButton } from "@/components/Wishlist";

export const dynamic = "force-dynamic";

/**
 * An expert's profile, as the client's template and matching the supplier page: photo or logo with
 * the name beside Address, Phone, Country, Email, District, Website, Category, Specialty and Profile;
 * then a Services table (SN, Service, Price, Remark) and a Jobs Done table (Job, Client).
 *
 * Phone, email, service prices and the profile file are member detail: for visitors they are never
 * sent to the page. Jobs show only where the client has permitted it and the team has approved them.
 */
export default async function ExpertPage({ params }: { params: { slug: string } }) {
  const viewer = await getViewer();
  const item = await prisma.contentItem.findFirst({
    where: { slug: params.slug, contentType: "CONSULTANT", publicationStatus: viewer.isStaff ? undefined : "PUBLISHED" },
    include: {
      primaryCategory: true,
      consultant: {
        include: {
          services: { orderBy: { name: "asc" } },
          projects: { where: { publicationPermitted: true, status: "PUBLISHED" }, orderBy: [{ year: "desc" }, { createdAt: "desc" }], select: { id: true, title: true, clientName: true } },
        },
      },
    },
  });
  if (!item?.consultant) notFound();
  const c = item.consultant;
  const path = `/experts/${item.slug}`;
  await trackView(viewer, item.id, path);
  const plan = popupPlan(await cachedMemberPlan());

  const gated = item.accessLevel !== "PUBLIC" && !viewer.isMember;
  const name = (c.fullName || item.title).replace(/^Sample:\s*/i, "");
  const category = item.primaryCategory?.name ?? c.professionalTitle;

  const members = <Link href={path} data-onboard="" className="inline-flex items-center gap-1.5 font-semibold text-brand hover:text-brand-dark"><LockKeyhole aria-hidden className="h-3.5 w-3.5" />Members only</Link>;
  const none = <span className="font-normal text-ink-muted">—</span>;
  const rows: ProfileFact[] = [
    { label: "Address", icon: MapPin, value: c.address || none },
    { label: "Phone", icon: Phone, value: gated ? members : c.phone ? <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="text-heading hover:text-brand">{c.phone}</a> : none },
    { label: "Country", icon: Globe, value: c.country || none },
    { label: "Email", icon: Mail, value: gated ? members : c.email ? <a href={`mailto:${c.email}`} className="break-all text-heading hover:text-brand">{c.email}</a> : none },
    { label: "District", icon: Landmark, value: c.district || none },
    { label: "Website", icon: Link2, value: c.website ? <a href={c.website} target="_blank" rel="noopener noreferrer" className="break-all text-brand hover:text-brand-dark">{c.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</a> : none },
    { label: "Category", icon: Tag, value: category || none },
    { label: "Specialty", icon: Sparkles, value: c.specialties.join(", ") || none },
    { label: "Profile", icon: FileDown, value: !c.profileUrl ? none : gated ? members : <a href={c.profileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-brand hover:text-brand-dark"><FileDown aria-hidden className="h-4 w-4" />Download</a> },
  ];
  const th = "px-3 py-2.5 font-semibold";
  const td = "px-3 py-2";

  return (
    <OnboardingGate signedIn={Boolean(viewer.userId)} isMember={viewer.isMember} googleEnabled={googleEnabled} plan={plan}>
      <article>
        <ProfileTop back="/experts" backLabel="All experts" image={c.photoUrl} name={name} sub={c.businessName}>
          <span className="block w-full rounded-xl bg-white"><WishlistButton id={item.id} /></span>
          <RememberVisit item={{ href: path, title: name, kind: "Expert", icon: "expert", picture: c.photoUrl }} />
        </ProfileTop>
        <div className="bg-page">
        <div className="container-site flex flex-col gap-4 pb-6">
          <ProfileFacts facts={rows} />

          <section id="services" className="flex scroll-mt-28 flex-col gap-3 rounded-2xl border border-line bg-white p-4">
            <h2 className="font-display text-lg font-extrabold text-heading">Services</h2>
            {c.services.length ? (
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-[520px] text-left text-[13px] sm:text-sm">
                  <thead className="bg-brand-tint text-xs font-bold text-brand-dark">
                    <tr><th className={`${th} w-12`}>SN</th><th className={th}>Service</th><th className={th}>Price</th><th className={th}>Remark</th></tr>
                  </thead>
                  <tbody>
                    {c.services.map((s, n) => (
                      <tr key={s.id} className="border-t border-line align-middle">
                        <td className={`${td} text-ink-muted`}>{n + 1}</td>
                        <td className={`${td} font-semibold text-heading`}>{s.name}</td>
                        <td className={`${td} whitespace-nowrap font-semibold text-heading`}>{!s.price ? none : gated ? members : s.price}</td>
                        <td className={`${td} text-ink-soft`}>{s.remark ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-sm text-ink-muted">This expert hasn&apos;t added services yet.</p>}
          </section>

          <section id="jobs" className="flex scroll-mt-28 flex-col gap-3 rounded-2xl border border-line bg-white p-4">
            <h2 className="font-display text-lg font-extrabold text-heading">Jobs Done</h2>
            {c.projects.length ? (
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-[420px] text-left text-[13px] sm:text-sm">
                  <thead className="bg-brand-tint text-xs font-bold text-brand-dark">
                    <tr><th className={`${th} w-12`}>SN</th><th className={th}>Job</th><th className={th}>Client</th></tr>
                  </thead>
                  <tbody>
                    {c.projects.map((j, n) => (
                      <tr key={j.id} className="border-t border-line align-middle">
                        <td className={`${td} text-ink-muted`}>{n + 1}</td>
                        <td className={`${td} font-semibold text-heading`}>{j.title}</td>
                        <td className={`${td} text-ink-soft`}>{j.clientName ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-sm text-ink-muted">This expert hasn&apos;t added jobs yet.</p>}
          </section>

          <p className="text-[13px] text-ink-muted"><Link href={`/corrections?item=${item.id}`} className="font-semibold text-ink-soft hover:text-brand">Report a mistake</Link></p>
        </div>
        </div>
      </article>
    </OnboardingGate>
  );
}

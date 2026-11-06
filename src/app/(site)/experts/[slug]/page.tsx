import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, BriefcaseBusiness, Clock, FileDown, Globe, GraduationCap, Languages, Link2, LockKeyhole, MapPin, MonitorSmartphone, Star, type LucideIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { googleEnabled } from "@/lib/auth";
import { cachedMemberPlan } from "@/lib/cached";
import { popupPlan } from "@/lib/billing";
import { date } from "@/lib/format";
import { ContactButtons } from "@/components/ContactButtons";
import { trackView } from "@/components/DetailParts";
import { MemberValue } from "@/components/MemberValue";
import { OnboardingGate } from "@/components/Onboarding";
import { RememberVisit } from "@/components/Recent";
import { WishlistButton } from "@/components/Wishlist";

export const dynamic = "force-dynamic";

/**
 * An expert's profile, built to show why they are worth contacting: who they are and what they do at
 * the top, the proof (jobs done, reviews, qualifications, when our team checked them), their services,
 * and a card that stays in view with Call me, WhatsApp me and Email me. On phones the card comes first
 * after the top. Anything not filled in is left out, so a profile never shows empty boxes.
 *
 * Phone, email, service prices and the profile file are member detail: for visitors they are never
 * sent to the page. Jobs show only where the client has permitted it and the team has approved them;
 * reviews only once approved, and the evidence behind them stays with the team.
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
          qualifications: { orderBy: { year: "desc" }, select: { id: true, qualification: true, institution: true, year: true } },
          reviews: { where: { moderation: "APPROVED" }, orderBy: { createdAt: "desc" }, select: { id: true, rating: true, body: true, confirmedEngagement: true } },
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
  const role = [c.professionalTitle ?? item.primaryCategory?.name, c.businessName].filter(Boolean).join(" · ");
  const rating = c.reviews.length ? c.reviews.reduce((n, r) => n + r.rating, 0) / c.reviews.length : null;
  const about = item.overview ?? item.shortSummary;
  const place = [c.address, c.district, c.country].filter(Boolean).join(", ");

  // The proof, at a glance. Only what is really there.
  const proof: { value: string; label: string; icon: LucideIcon }[] = [
    ...(rating !== null ? [{ value: rating.toFixed(1), label: `From ${c.reviews.length} client review${c.reviews.length === 1 ? "" : "s"}`, icon: Star }] : []),
    ...(c.projects.length ? [{ value: String(c.projects.length), label: `Job${c.projects.length === 1 ? "" : "s"} done`, icon: BriefcaseBusiness }] : []),
    ...(c.services.length ? [{ value: String(c.services.length), label: `Service${c.services.length === 1 ? "" : "s"} offered`, icon: BadgeCheck }] : []),
    ...(c.qualifications.length ? [{ value: String(c.qualifications.length), label: `Qualification${c.qualifications.length === 1 ? "" : "s"}`, icon: GraduationCap }] : []),
  ];
  const details: [LucideIcon, string, React.ReactNode][] = [
    ...(c.responseTime ? [[Clock, "Replies", c.responseTime] as [LucideIcon, string, React.ReactNode]] : []),
    ...(c.availability ? [[Clock, "Available", c.availability] as [LucideIcon, string, React.ReactNode]] : []),
    ...(c.deliveryModes.length ? [[MonitorSmartphone, "Works", c.deliveryModes.join(", ")] as [LucideIcon, string, React.ReactNode]] : []),
    ...(c.languages.length ? [[Languages, "Languages", c.languages.join(", ")] as [LucideIcon, string, React.ReactNode]] : []),
    ...(place ? [[MapPin, "Based in", place] as [LucideIcon, string, React.ReactNode]] : []),
    ...(c.website ? [[Link2, "Website", <a key="w" href={c.website} target="_blank" rel="noopener noreferrer" className="break-all text-brand hover:text-brand-dark">{c.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</a>] as [LucideIcon, string, React.ReactNode]] : []),
    ...(c.profileUrl ? [[FileDown, "Full profile", gated
      ? <Link key="p" href={path} data-onboard="" className="inline-flex items-center gap-1.5 text-brand hover:text-brand-dark"><LockKeyhole aria-hidden className="h-3.5 w-3.5" />Members only</Link>
      : <a key="p" href={c.profileUrl} target="_blank" rel="noopener noreferrer" className="text-brand hover:text-brand-dark">Download</a>] as [LucideIcon, string, React.ReactNode]] : []),
  ];
  const card = "flex flex-col gap-3 rounded-3xl border border-line bg-white p-5 sm:p-6";
  const h2 = "font-display text-[20px] font-extrabold leading-tight text-heading sm:text-[22px]";

  return (
    <OnboardingGate signedIn={Boolean(viewer.userId)} isMember={viewer.isMember} googleEnabled={googleEnabled} plan={plan}>
      <article>
        {/* ── Who they are, and what they do ── */}
        <header className="under-header hero-glow hero-still bg-navy text-white">
          <div className="container-site flex flex-col gap-5 pb-8 pt-5 sm:pb-10 sm:pt-7">
            <Link href="/experts" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-white hover:text-white/80"><ArrowLeft aria-hidden className="h-4 w-4" />All experts</Link>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex min-w-0 items-start gap-4 sm:items-center sm:gap-5">
                {c.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- uploaded or editor-entered address
                  <img src={c.photoUrl} alt="" className="h-24 w-24 shrink-0 rounded-3xl bg-white object-cover ring-4 ring-white/15 sm:h-32 sm:w-32" />
                ) : <span aria-hidden className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-accent font-display text-[38px] font-extrabold text-ink ring-4 ring-white/15 sm:h-32 sm:w-32">{name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}</span>}
                <div className="flex min-w-0 flex-col gap-2">
                  <h1 className="text-hero text-[28px] leading-[1.1] sm:text-[40px]">{name}</h1>
                  {role ? <p className="text-[16px] font-medium">{role}</p> : null}
                  {item.lastReviewedAt ? <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[13px] font-bold text-heading"><BadgeCheck aria-hidden className="h-4 w-4 text-brand" />Checked by our team, {date(item.lastReviewedAt)}</span> : null}
                  {c.specialties.length ? (
                    <ul aria-label="Specialties" className="flex flex-wrap gap-1.5 pt-1">
                      {c.specialties.slice(0, 8).map((x) => <li key={x} className="rounded-full bg-white/15 px-3 py-1 text-[14px] font-semibold">{x}</li>)}
                    </ul>
                  ) : null}
                </div>
              </div>
              <div className="shrink-0 text-ink sm:w-52">
                <span className="block w-full rounded-xl bg-white"><WishlistButton id={item.id} /></span>
                <RememberVisit item={{ href: path, title: name, kind: "Expert", icon: "expert", picture: c.photoUrl }} />
              </div>
            </div>
          </div>
        </header>

        <div className="bg-page">
          <div className="container-site grid grid-cols-[minmax(0,1fr)] items-start gap-4 py-5 sm:py-7 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
            <div className="flex min-w-0 flex-col gap-4">
              {proof.length ? (
                <ul aria-label="At a glance" className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                  {proof.map(({ value, label, icon: Glyph }) => (
                    <li key={label} className="flex flex-col gap-1 rounded-2xl border border-line bg-white p-4">
                      <Glyph aria-hidden className="h-5 w-5 text-accent-dark" />
                      <span className="text-hero text-[28px] leading-none text-heading">{value}</span>
                      <span className="text-[13px] font-medium text-ink-soft">{label}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {about || c.experience ? (
                <section className={card}>
                  <h2 className={h2}>About {name}</h2>
                  {about ? <p className="whitespace-pre-line text-[16px] leading-relaxed text-ink-soft">{about}</p> : null}
                  {c.experience ? <p className="whitespace-pre-line text-[16px] leading-relaxed text-ink-soft">{c.experience}</p> : null}
                </section>
              ) : null}

              {c.services.length ? (
                <section id="services" className={`${card} scroll-mt-28`}>
                  <h2 className={h2}>What I can do for you</h2>
                  <ul className="flex flex-col gap-2">
                    {c.services.map((s) => (
                      <li key={s.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl bg-page px-4 py-3">
                        <span className="flex min-w-0 flex-col">
                          <span className="font-display text-[16px] font-extrabold text-heading">{s.name}</span>
                          {s.remark ? <span className="text-[14px] text-ink-soft">{s.remark}</span> : null}
                        </span>
                        {s.price ? (gated
                          ? <Link href={path} data-onboard="" className="inline-flex items-center gap-1.5 text-[14px] font-bold text-brand hover:text-brand-dark"><LockKeyhole aria-hidden className="h-4 w-4" />See price</Link>
                          : <span className="font-display text-[16px] font-extrabold text-brand-dark">{s.price}</span>) : null}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {c.reviews.some((r) => r.body) ? (
                <section className={card}>
                  <h2 className={h2}>What clients say</h2>
                  <ul className="flex flex-col gap-2">
                    {c.reviews.filter((r) => r.body).slice(0, 6).map((r) => (
                      <li key={r.id} className="flex flex-col gap-1.5 rounded-xl bg-page px-4 py-3">
                        <span className="flex flex-wrap items-center gap-2">
                          <span aria-label={`${r.rating} out of 5`} className="inline-flex gap-0.5 text-accent">{Array.from({ length: 5 }, (_, n) => <Star key={n} aria-hidden className={`h-4 w-4 ${n < r.rating ? "fill-current" : "text-line-strong"}`} />)}</span>
                          {r.confirmedEngagement ? <span className="text-[13px] font-semibold text-brand-dark">Confirmed client</span> : null}
                        </span>
                        <p className="text-[15px] leading-relaxed text-heading">{r.body}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {c.projects.length ? (
                <section id="jobs" className={`${card} scroll-mt-28`}>
                  <h2 className={h2}>Jobs done</h2>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {c.projects.map((j) => (
                      <li key={j.id} className="flex items-start gap-2.5 rounded-xl bg-page px-4 py-3">
                        <BriefcaseBusiness aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                        <span className="flex min-w-0 flex-col">
                          <span className="font-display text-[15px] font-extrabold text-heading">{j.title}</span>
                          {j.clientName ? <span className="text-[14px] text-ink-soft">For {j.clientName}</span> : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {c.qualifications.length ? (
                <section className={card}>
                  <h2 className={h2}>Qualifications</h2>
                  <ul className="flex flex-col gap-2">
                    {c.qualifications.map((q) => (
                      <li key={q.id} className="flex items-start gap-2.5">
                        <GraduationCap aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                        <span className="text-[15px] text-heading"><strong className="font-display font-extrabold">{q.qualification}</strong>{q.institution ? `, ${q.institution}` : ""}{q.year ? ` (${q.year})` : ""}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {gated ? <MemberValue wide back={path} plan={plan} unlocks={[...(c.phone ? ["Phone and WhatsApp"] : []), ...(c.email ? ["Email address"] : []), ...(c.services.some((x) => x.price) ? ["Service prices"] : []), ...(c.profileUrl ? ["Full profile download"] : [])]} /> : null}

              <p className="text-[13px] text-ink-muted"><Link href={`/corrections?item=${item.id}`} className="font-semibold text-ink-soft hover:text-brand">Report a mistake</Link></p>
            </div>

            {/* ── Get in touch: first on phones, beside the profile on wide screens ── */}
            <aside className="order-first flex flex-col gap-4 rounded-3xl border border-line bg-white p-5 lg:sticky lg:top-32 lg:order-none">
              <h2 className={h2}>Talk to this expert</h2>
              <ContactButtons phone={c.phone} email={c.email} gated={gated} back={path} />
              {details.length ? (
                <dl className="flex flex-col gap-3 border-t border-line pt-4">
                  {details.map(([Glyph, label, value]) => (
                    <div key={label} className="flex min-w-0 items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand"><Glyph aria-hidden className="h-4 w-4" strokeWidth={1.75} /></span>
                      <span className="flex min-w-0 flex-col">
                        <dt className="text-[12px] font-medium text-ink-muted">{label}</dt>
                        <dd className="min-w-0 break-words font-display text-[15px] font-bold text-heading">{value}</dd>
                      </span>
                    </div>
                  ))}
                </dl>
              ) : null}
              <p className="flex items-center gap-1.5 border-t border-line pt-3 text-[12px] leading-snug text-ink-muted"><Globe aria-hidden className="h-3.5 w-3.5 shrink-0" />Say you found them on BizSphere-Ug.</p>
            </aside>
          </div>
        </div>
      </article>
    </OnboardingGate>
  );
}

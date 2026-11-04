import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, Award, BadgeCheck, Briefcase, CalendarCheck, Clock, Globe, GraduationCap, Languages, LockKeyhole,
  Mail, MapPin, MessageSquareQuote, Monitor, Phone, ShieldCheck, Sparkles, Star, Users,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { googleEnabled } from "@/lib/auth";
import { cachedMemberPlan } from "@/lib/cached";
import { popupPlan } from "@/lib/billing";
import { date, moneyRange } from "@/lib/format";
import { Connected, Evidence, trackView } from "@/components/DetailParts";
import { OnboardingGate } from "@/components/Onboarding";
import { ExpertReviewForm } from "@/components/ExpertReviewForm";
import { ExpertWork } from "@/components/ExpertWork";
import { ReadMore, RecentStrip, RememberVisit } from "@/components/Recent";
import { WishlistButton } from "@/components/Wishlist";

export const dynamic = "force-dynamic";

/**
 * An expert's profile, laid out like a professional services profile:
 *   - a deep blue band: photo (or initials), name, title, location, rating, the team's check, and
 *     a card with the ways to get in touch
 *   - a strip of numbers: specialties, past work, reviews, response time
 *   - the body: about, specialties, services, qualifications, fees, past work, reviews (and the form
 *     to write one), the team's checks; beside it contact, key facts, links and related pages
 *
 * Client fields: Consultant Name, Profile, Category, Specialty, Country, District, Email, Phone, Website.
 * Email, phone and fees are member detail: for visitors they are never read into the page.
 */
export default async function ExpertPage({ params, searchParams }: { params: { slug: string }; searchParams: { review?: string } }) {
  const viewer = await getViewer();
  const item = await prisma.contentItem.findFirst({
    where: { slug: params.slug, contentType: "CONSULTANT", publicationStatus: viewer.isStaff ? undefined : "PUBLISHED" },
    include: {
      primaryCategory: true,
      consultant: {
        include: {
          projects: { where: { publicationPermitted: true }, orderBy: [{ year: "desc" }, { createdAt: "desc" }] },
          services: true,
          qualifications: { orderBy: { year: "desc" } },
          reviews: { where: { moderation: "APPROVED" }, orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
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
  const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };
  // Reference contacts are member detail; never passed to the page.
  const work = c.projects.map(({ referenceContact: _ref, ...w }) => w);
  const reviews = c.reviews;
  const rating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;
  const initials = c.fullName.replace(/^Sample\s+/i, "").split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  const where = [c.district, c.country].filter(Boolean).join(", ");
  const title = c.professionalTitle || item.primaryCategory?.name || "Business expert";
  const fees = !gated && (c.feeMin != null || c.feeMax != null) ? `${moneyRange(c.feeMin, c.feeMax, c.currency)}${c.pricingBasis ? ` ${c.pricingBasis}` : ""}` : null;
  const links = [
    ...(c.website ? [{ label: host(c.website), href: c.website, icon: Globe }] : []),
    ...c.links.map((l) => ({ label: host(l), href: l, icon: Globe })),
  ];

  const stats: { icon: typeof Star; value: string; label: string }[] = [
    { icon: Sparkles, value: String(c.specialties.length || "—"), label: c.specialties.length === 1 ? "Specialty" : "Specialties" },
    { icon: Briefcase, value: String(work.length || "—"), label: "Past projects" },
    { icon: Star, value: rating ? rating.toFixed(1) : "New", label: reviews.length ? `${reviews.length} ${reviews.length === 1 ? "review" : "reviews"}` : "No reviews yet" },
    { icon: Clock, value: c.responseTime || "—", label: "Usually replies" },
  ];
  const facts = ([
    ["Category", item.primaryCategory?.name],
    ["Specialty", c.specialties.join(", ")],
    ["Location", where],
    ["Works", c.deliveryModes.join(", ")],
    ["Languages", c.languages.join(", ")],
    ["Experience", c.experience],
    ["Availability", c.availability],
    ["Consultation", c.consultationMins ? `${c.consultationMins} minutes` : null],
  ] as [string, string | null | undefined][]).filter(([, v]) => v);

  const card = "rounded-3xl border border-line bg-white p-5 sm:p-7";
  const h2 = "flex items-center gap-2.5 font-display text-[19px] font-extrabold tracking-[-0.01em] text-heading";
  const h2icon = "flex h-8 w-8 items-center justify-center rounded-xl bg-brand-tint text-brand";

  const contactCard = (
    <section id="contact" className="flex scroll-mt-36 flex-col gap-3 rounded-3xl border border-line bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-[17px] font-extrabold text-heading">Get in touch</h2>
        {gated ? <span className="inline-flex items-center gap-1 rounded-full bg-accent-tint px-2.5 py-1 text-[11px] font-bold text-accent-dark"><LockKeyhole aria-hidden className="h-3 w-3" />Members</span> : null}
      </div>
      {gated ? (
        <>
          {/* Placeholder rows, blurred: no real contact detail is sent to visitors */}
          <div aria-hidden className="flex flex-col gap-2 blur-[3px]">
            <span className="flex items-center gap-3 rounded-xl bg-page px-3 py-2.5 text-sm"><Phone className="h-4 w-4 text-brand" />+256 7•• ••• •••</span>
            <span className="flex items-center gap-3 rounded-xl bg-page px-3 py-2.5 text-sm"><Mail className="h-4 w-4 text-brand" />name@example.co.ug</span>
          </div>
          <Link href={path} data-onboard="" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white hover:bg-brand-dark hover:text-white"><LockKeyhole aria-hidden className="h-4 w-4" />Unlock contact details</Link>
          <p className="text-center text-[11px] text-ink-muted">{plan.monthly ? `From ${plan.monthly} a month · ` : ""}MoMo, Airtel Money or card</p>
        </>
      ) : c.phone || c.email ? (
        <>
          {c.phone ? <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="flex h-12 items-center gap-3 rounded-xl bg-brand px-4 text-sm font-bold text-white hover:bg-brand-dark hover:text-white"><Phone aria-hidden className="h-4 w-4" />Call {c.phone}</a> : null}
          {c.email ? <a href={`mailto:${c.email}`} className="flex h-12 min-w-0 items-center gap-3 rounded-xl border border-line px-4 text-sm font-semibold text-heading hover:border-brand hover:text-brand"><Mail aria-hidden className="h-4 w-4 shrink-0 text-brand" /><span className="truncate">{c.email}</span></a> : null}
          <p className="text-[12px] leading-relaxed text-ink-muted">Say you found them on BizSphere-Ug. Agree prices and terms in writing before you pay.</p>
        </>
      ) : <p className="text-sm text-ink-muted">Contact details not added yet.</p>}
      {c.bookingUrl ? (
        <a href={c.bookingUrl} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-xl bg-accent text-sm font-bold text-ink hover:bg-accent/90 hover:text-ink"><CalendarCheck aria-hidden className="h-4 w-4" />Book a consultation</a>
      ) : null}
      <WishlistButton id={item.id} />
    </section>
  );

  return (
    <OnboardingGate signedIn={Boolean(viewer.userId)} isMember={viewer.isMember} googleEnabled={googleEnabled} plan={plan}>
      {/* ── Profile band: the site's standard deep navy band (hero-glow), the same colours as every other page ── */}
      <header className="under-header relative isolate overflow-hidden hero-glow bg-navy text-white">
        <div className="container-site flex flex-col gap-6 pb-20 pt-5 sm:pb-24 sm:pt-8">
          <Link href="/experts" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-white/75 hover:text-white"><ArrowLeft aria-hidden className="h-4 w-4" />All business experts</Link>

          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-7">
            <div className="relative h-28 w-28 shrink-0 sm:h-32 sm:w-32">
              {c.photoUrl ? (
                // Photo entered by the team or the expert; no Next image domain list to maintain.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.photoUrl} alt={c.fullName} className="h-full w-full rounded-3xl object-cover ring-4 ring-white/20" />
              ) : (
                <span className="flex h-full w-full items-center justify-center rounded-3xl bg-[linear-gradient(135deg,#F28C28,#F5B062)] font-display text-[40px] font-extrabold text-white ring-4 ring-white/20">{initials || "?"}</span>
              )}
              <span title="Checked by our team" className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-brand shadow-lg"><BadgeCheck aria-hidden className="h-6 w-6" /></span>
            </div>
            <div className="flex min-w-0 flex-col gap-2.5">
              <span className="w-fit rounded-full bg-white/10 px-3 py-1 text-[12px] font-semibold text-white/90 ring-1 ring-white/15">{title}</span>
              <h1 className="font-display text-[30px] font-extrabold leading-[1.08] tracking-[-0.03em] sm:text-[42px]">{c.fullName}</h1>
              {item.shortSummary ? <p className="max-w-2xl text-[15px] leading-relaxed text-white/80 sm:text-base">{item.shortSummary}</p> : null}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-white/80">
                {where ? <span className="inline-flex items-center gap-1.5"><MapPin aria-hidden className="h-4 w-4 text-accent" />{where}</span> : null}
                <span className="inline-flex items-center gap-1.5">
                  <Stars value={rating ?? 0} />
                  {rating ? <><strong className="font-semibold text-white">{rating.toFixed(1)}</strong> ({reviews.length})</> : "No reviews yet"}
                </span>
                <span className="inline-flex items-center gap-1.5"><ShieldCheck aria-hidden className="h-4 w-4 text-accent" />Checked {date(item.lastReviewedAt)}</span>
                {viewer.isMember ? <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-[12px] font-bold text-ink"><BadgeCheck aria-hidden className="h-3.5 w-3.5" />Full access</span> : null}
              </div>
              <RememberVisit item={{ href: path, title: c.fullName, kind: "Expert", icon: "expert", picture: c.photoUrl }} />
            </div>
          </div>
        </div>
      </header>

      <div className="bg-page">
        {/* ── Numbers, overlapping the band ── */}
        <div className="container-site relative -mt-14 sm:-mt-16">
          <dl className="grid grid-cols-2 gap-2 rounded-3xl border border-line bg-white p-2 shadow-[0_14px_40px_rgba(7,26,51,0.10)] sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="flex items-center gap-3 rounded-2xl px-3 py-3 sm:px-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-tint text-brand"><s.icon aria-hidden className="h-5 w-5" /></span>
                <span className="flex min-w-0 flex-col">
                  <dd className="truncate font-display text-[19px] font-extrabold leading-tight text-heading">{s.value}</dd>
                  <dt className="truncate text-[12px] text-ink-muted">{s.label}</dt>
                </span>
              </div>
            ))}
          </dl>
        </div>

        <div className="container-site grid grid-cols-[minmax(0,1fr)] gap-6 py-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-8 lg:py-10">
          <div className="flex min-w-0 flex-col gap-6">
            {/* Phones: the contact card comes first */}
            <div className="lg:hidden">{contactCard}</div>

            {item.overview ? (
              <section id="about" className={`flex flex-col gap-3 ${card}`}>
                <h2 className={h2}><span className={h2icon}><Users aria-hidden className="h-4 w-4" /></span>About</h2>
                <ReadMore text={item.overview} lines={6} />
              </section>
            ) : null}

            {c.specialties.length ? (
              <section className={`flex flex-col gap-4 ${card}`}>
                <h2 className={h2}><span className={h2icon}><Sparkles aria-hidden className="h-4 w-4" /></span>Specialties</h2>
                <ul className="flex flex-wrap gap-2">
                  {c.specialties.map((s) => (
                    <li key={s}><Link href={`/experts?specialty=${encodeURIComponent(s)}`} className="inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand-tint px-3.5 py-1.5 text-[13px] font-semibold text-brand-dark hover:border-brand hover:text-brand-dark"><BadgeCheck aria-hidden className="h-3.5 w-3.5" />{s}</Link></li>
                  ))}
                </ul>
              </section>
            ) : null}

            {c.services.length ? (
              <section className={`flex flex-col gap-4 ${card}`}>
                <h2 className={h2}><span className={h2icon}><Briefcase aria-hidden className="h-4 w-4" /></span>Services</h2>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {c.services.map((s) => (
                    <li key={s.id} className="flex flex-col gap-1.5 rounded-2xl border border-line bg-page/60 p-4">
                      <span className="font-display text-[15px] font-bold text-heading">{s.name}</span>
                      {s.description ? <span className="text-[13px] leading-relaxed text-ink-soft">{s.description}</span> : null}
                      <span className="mt-1 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                        {s.deliveryMode ? <span className="rounded-full bg-white px-2 py-0.5 text-ink-soft ring-1 ring-line">{s.deliveryMode}</span> : null}
                        {s.coverage ? <span className="rounded-full bg-white px-2 py-0.5 text-ink-soft ring-1 ring-line">{s.coverage}</span> : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {c.qualifications.length ? (
              <section className={`flex flex-col gap-4 ${card}`}>
                <h2 className={h2}><span className={h2icon}><GraduationCap aria-hidden className="h-4 w-4" /></span>Qualifications</h2>
                <ul className="flex flex-col divide-y divide-line">
                  {c.qualifications.map((q) => (
                    <li key={q.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                      <Award aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-accent-dark" />
                      <span className="flex flex-col">
                        <span className="font-semibold text-heading">{q.qualification}</span>
                        <span className="text-[13px] text-ink-muted">{[q.institution, q.professionalBody, q.year].filter(Boolean).join(" · ")}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {c.feeMin != null || c.feeMax != null ? (
              <section className={`flex flex-col gap-3 ${card}`}>
                <h2 className={h2}><span className={h2icon}><Monitor aria-hidden className="h-4 w-4" /></span>Fees</h2>
                {fees ? (
                  <p className="font-display text-[22px] font-extrabold text-brand-dark">{fees}{c.quotationRequired ? <span className="ml-2 align-middle text-[12px] font-semibold text-ink-muted">quotation needed</span> : null}</p>
                ) : (
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-line-strong bg-page p-4 text-sm text-ink-muted">
                    <span>Fees are for members.</span>
                    <Link href={path} data-onboard="" className="inline-flex items-center gap-1.5 font-semibold text-brand hover:text-brand-dark"><LockKeyhole aria-hidden className="h-3.5 w-3.5" />Unlock</Link>
                  </div>
                )}
              </section>
            ) : null}

            <ExpertWork work={work} />

            {/* Reviews: approved by the team before they show */}
            <section id="reviews" className={`flex scroll-mt-36 flex-col gap-5 ${card}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className={h2}><span className={h2icon}><MessageSquareQuote aria-hidden className="h-4 w-4" /></span>Client reviews</h2>
                {rating ? <span className="inline-flex items-center gap-2 text-sm text-ink-muted"><Stars value={rating} dark /><strong className="text-heading">{rating.toFixed(1)}</strong> from {reviews.length}</span> : null}
              </div>
              {reviews.length ? (
                <ul className="flex flex-col gap-3">
                  {reviews.map((r) => (
                    <li key={r.id} className="flex flex-col gap-2 rounded-2xl bg-page p-4">
                      <span className="flex flex-wrap items-center justify-between gap-2">
                        <span className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-[13px] font-bold text-white">{(r.author?.name ?? "C").charAt(0).toUpperCase()}</span>
                          <span className="text-sm font-semibold text-heading">{r.author?.name && !r.author.name.startsWith("+") ? r.author.name : "A client"}</span>
                          {r.confirmedEngagement ? <span className="rounded-full bg-brand-tint px-2 py-0.5 text-[11px] font-semibold text-brand-dark">Confirmed client</span> : null}
                        </span>
                        <span className="flex items-center gap-2 text-[12px] text-ink-muted"><Stars value={r.rating} dark />{date(r.createdAt)}</span>
                      </span>
                      {r.body ? <p className="text-[14px] leading-relaxed text-ink-soft">{r.body}</p> : null}
                    </li>
                  ))}
                </ul>
              ) : <p className="rounded-2xl bg-page p-4 text-sm text-ink-muted">No reviews yet. Worked with {c.fullName.replace(/^Sample\s+/i, "")}? Be the first to review below.</p>}
              <div className="border-t border-line pt-5">
                <ExpertReviewForm consultantId={c.id} back={path} signedIn={Boolean(viewer.userId)} status={searchParams.review} />
              </div>
            </section>

            <div id="checks" className="scroll-mt-36">
              <Evidence contentItemId={item.id} lastReviewedAt={item.lastReviewedAt} nextReviewDueAt={item.nextReviewDueAt} viewer={viewer} back={path} />
            </div>
          </div>

          {/* ── Beside the profile ── */}
          <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
            <div className="hidden lg:block">{contactCard}</div>

            {facts.length ? (
              <section className="flex flex-col gap-1 rounded-3xl border border-line bg-white p-5 sm:p-6">
                <h2 className="mb-2 font-display text-[17px] font-extrabold text-heading">Key facts</h2>
                <dl className="flex flex-col divide-y divide-line text-[14px]">
                  {facts.map(([k, v]) => {
                    const FactIcon = k === "Location" ? MapPin : k === "Languages" ? Languages : k === "Works" ? Monitor : k === "Availability" || k === "Consultation" ? Clock : BadgeCheck;
                    return (
                      <div key={k} className="flex items-start gap-3 py-2.5">
                        <FactIcon aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                        <dt className="w-24 shrink-0 text-ink-muted">{k}</dt>
                        <dd className="min-w-0 font-semibold text-heading">{v}</dd>
                      </div>
                    );
                  })}
                </dl>
              </section>
            ) : null}

            {links.length ? (
              <section className="flex flex-col gap-2 rounded-3xl border border-line bg-white p-5 sm:p-6">
                <h2 className="mb-1 font-display text-[17px] font-extrabold text-heading">Online</h2>
                {links.map((l) => (
                  <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className="group flex h-11 items-center justify-between gap-3 rounded-xl border border-line pl-3.5 pr-2 text-sm font-semibold text-ink hover:border-brand hover:text-brand">
                    <span className="inline-flex min-w-0 items-center gap-2.5"><l.icon aria-hidden className="h-4 w-4 shrink-0 text-brand" /><span className="truncate">{l.label}</span></span>
                    <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-page text-ink-muted transition group-hover:bg-brand group-hover:text-white">↗</span>
                  </a>
                ))}
              </section>
            ) : null}

            <Connected contentItemId={item.id} title="Related" />
            <p className="px-1 text-[12px] text-ink-muted">Something wrong on this profile? <Link href={`/corrections?item=${item.id}`} className="font-semibold">Report a mistake</Link>.</p>
          </aside>
        </div>
        <div className="container-site pb-10"><RecentStrip exclude={path} title="You looked at these recently" /></div>
      </div>
    </OnboardingGate>
  );
}

/** Five stars, filled to the rating. `dark`: on a light background. */
function Stars({ value, dark = false }: { value: number; dark?: boolean }) {
  return (
    <span aria-label={`${value.toFixed(1)} out of 5`} className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} aria-hidden className={`h-3.5 w-3.5 ${n <= Math.round(value) ? "fill-accent text-accent" : dark ? "text-line-strong" : "text-white/35"}`} />
      ))}
    </span>
  );
}

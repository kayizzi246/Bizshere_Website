import { itemMetadata } from "@/lib/seo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, CalendarCheck, Clock, Globe, GraduationCap, Languages, LockKeyhole, MonitorSmartphone, Star, Wallet, type LucideIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { googleEnabled } from "@/lib/auth";
import { cachedMemberPlan } from "@/lib/cached";
import { popupPlan } from "@/lib/billing";
import { expertNames, phoneNumbers } from "@/lib/expert-names";
import { date, moneyRange } from "@/lib/format";
import { ProfileTitle } from "@/components/ProfileTitle";
import { ProfileCard, type ProfileRow } from "@/components/ProfileCard";
import { ContactButtons } from "@/components/ContactButtons";
import { trackView } from "@/components/DetailParts";
import { MemberValue } from "@/components/MemberValue";
import { OnboardingGate } from "@/components/Onboarding";
import { RememberVisit } from "@/components/Recent";
import { WishlistButton } from "@/components/Wishlist";
import { PdfOpenButton } from "@/components/PdfViewer";
import { isPdf } from "@/lib/pdf-file";

export const dynamic = "force-dynamic";

/**
 * An expert's profile on the client's template (24 Nov 2026): the photo or logo beside a table of address, phone,
 * country, email, district, website, category, specialty and profile; then the Services table (picture, name,
 * description, duration, price) and Jobs done (job, client). About, reviews and qualifications follow where there
 * are any. Beside it, a card that stays in view with Call me, WhatsApp me and Email me.
 *
 * Phone, email, service prices and the profile file are member detail: for visitors they are never
 * sent to the page. Jobs show only where the client has permitted it and the team has approved them;
 * reviews only once approved, and the evidence behind them stays with the team.
 */
export default async function ExpertPage({ params }: { params: { slug: string } }) {
  const viewer = await getViewer();
  const item = await prisma.contentItem.findFirst({
    // Published pages for everyone; staff see drafts; an expert also sees their own page before it is approved
    where: { slug: params.slug, contentType: "CONSULTANT", ...(viewer.isStaff ? {} : viewer.userId ? { OR: [{ publicationStatus: "PUBLISHED" as const }, { consultant: { ownerId: viewer.userId } }] } : { publicationStatus: "PUBLISHED" as const }) },
    include: {
      primaryCategory: true,
      consultant: {
        include: {
          services: { orderBy: { id: "asc" } },
          projects: { where: { publicationPermitted: true, status: "PUBLISHED" }, orderBy: { createdAt: "asc" }, select: { id: true, title: true, clientName: true } },
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
  const { name, business } = expertNames(item.title, c);
  const role = [c.professionalTitle, business].filter(Boolean).join(" · ");
  const rating = c.reviews.length ? c.reviews.reduce((n, r) => n + r.rating, 0) / c.reviews.length : null;
  // Both the brief and the description from the admin (once, when they are the same)
  const about = [...new Set([item.shortSummary, item.overview].filter((x): x is string => Boolean(x?.trim())))].join("\n\n") || null;

  // Fees and the booking link are member detail (MEMBER_ONLY): visitors get the lock, never the value
  const membersOnly = (key: string) => <Link key={key} href={path} data-onboard="" className="inline-flex items-center gap-1.5 text-brand hover:text-brand-dark"><LockKeyhole aria-hidden className="h-3.5 w-3.5" />Members only</Link>;
  const hasFee = c.feeMin !== null || c.feeMax !== null;
  const fee = [hasFee ? moneyRange(c.feeMin, c.feeMax, c.currency) : null, c.pricingBasis, c.quotationRequired ? "gives a quote first" : null].filter(Boolean).join(" · ");
  const details: [LucideIcon, string, React.ReactNode][] = [
    ...(fee ? [[Wallet, "Fees", gated ? membersOnly("f") : fee] as [LucideIcon, string, React.ReactNode]] : []),
    ...(c.consultationMins ? [[Clock, "Consultation", `${c.consultationMins} minutes`] as [LucideIcon, string, React.ReactNode]] : []),
    ...(c.bookingUrl ? [[CalendarCheck, "Book", gated ? membersOnly("b") : <a key="b" href={c.bookingUrl} target="_blank" rel="noopener noreferrer" className="break-all text-brand hover:text-brand-dark">Book or ask a question</a>] as [LucideIcon, string, React.ReactNode]] : []),
    ...(c.responseTime ? [[Clock, "Replies", c.responseTime] as [LucideIcon, string, React.ReactNode]] : []),
    ...(c.availability ? [[Clock, "Available", c.availability] as [LucideIcon, string, React.ReactNode]] : []),
    ...(c.deliveryModes.length ? [[MonitorSmartphone, "Works", c.deliveryModes.join(", ")] as [LucideIcon, string, React.ReactNode]] : []),
    ...(c.languages.length ? [[Languages, "Languages", c.languages.join(", ")] as [LucideIcon, string, React.ReactNode]] : []),
  ];
  // The client's template (24 Nov 2026), row for row. Phone, email and the profile are member detail: a lock, never the value.
  const lock = (key: string) => <Link key={key} href={path} data-onboard="" className="inline-flex items-center gap-1.5 text-brand hover:text-brand-dark"><LockKeyhole aria-hidden className="h-3.5 w-3.5" />Members only</Link>;
  const phones = phoneNumbers(c.phone);
  const site = c.website ? (/^https?:\/\//i.test(c.website) ? c.website : `https://${c.website}`) : null;
  const profile: ProfileRow[] = [
    ["Address", c.address],
    ["Phone", c.phone ? (gated ? lock("ph") : phones.length ? phones.map((p, n) => <span key={p}>{n ? ", " : ""}<a href={`tel:${p.replace(/[^+0-9]/g, "")}`} className="text-brand hover:text-brand-dark">{p}</a></span>) : c.phone) : null],
    ["Country", c.country],
    ["Email", c.email ? (gated ? lock("em") : <a href={`mailto:${c.email}`} className="break-all text-brand hover:text-brand-dark">{c.email}</a>) : null],
    ["District", c.district],
    ["Website", site ? <a href={site} target="_blank" rel="noopener noreferrer" className="break-all text-brand hover:text-brand-dark">{site.replace(/^https?:\/\//i, "").replace(/\/$/, "")}</a> : null],
    ["Category", item.primaryCategory?.name],
    ["Profile", c.profileUrl ? (gated ? lock("pr")
      // A PDF profile is read on the site first (/experts/[slug]/file); other files are downloaded
      : isPdf(c.profileUrl)
        ? <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1"><PdfOpenButton file={`${path}/file`} download={`${path}/file?download=1`} title={`${name}: profile`} className="font-semibold text-brand hover:text-brand-dark">Read here</PdfOpenButton><a href={`${path}/file?download=1`} className="font-semibold text-brand hover:text-brand-dark">Download</a></span>
        : <a href={c.profileUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand hover:text-brand-dark">Download</a>) : null],
  ];
  profile.push({ label: "Specialty", tags: c.specialties });
  const th = "px-4 py-2.5 text-left text-[12px] font-semibold text-white";
  const td = "px-4 py-3 align-top text-[14px] text-ink-soft";
  const card = "flex flex-col gap-2.5 rounded-2xl border border-line bg-white p-4 sm:p-5";
  const h2 = "font-display text-[20px] font-extrabold leading-tight text-heading sm:text-[22px]";

  return (
    <OnboardingGate signedIn={Boolean(viewer.userId)} isMember={viewer.isMember} googleEnabled={googleEnabled} plan={plan}>
      <article data-compact-page="">
        {item.publicationStatus !== "PUBLISHED" ? (
          <p role="status" className="bg-accent px-4 py-3 text-center text-[14px] font-semibold text-ink">Only you can see this page for now. Our team is checking it, and it goes on the website once approved. <Link href="/expert" className="underline">Back to my dashboard</Link></p>
        ) : null}
        {/* ── Who they are, and what they do ── */}
        <header className="under-header hero-glow hero-still bg-navy text-white">
          <div className="container-site flex flex-col gap-4 pad-hero">
            <Link href="/experts" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-white hover:text-white/80"><ArrowLeft aria-hidden className="h-4 w-4" />All experts</Link>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex min-w-0 items-start gap-4 sm:items-center sm:gap-5">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <ProfileTitle name={name} />
                  {role ? <p data-size="" className="text-[14px] font-medium text-white/85">{role}</p> : null}
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
          <div className="container-site grid grid-cols-[minmax(0,1fr)] items-start gap-5 pad-body lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
            <div className="flex min-w-0 flex-col gap-4">
              {/* ── The profile: photo or logo on the left, the details on the right ── */}
              <ProfileCard label="Business expert profile" photo={c.photoUrl} name={business ?? name} sub={business ? name : null} rows={profile} />

              {/* ── Services ── */}
              <section id="services" className="scroll-mt-28 overflow-hidden rounded-2xl border border-line bg-white">
                <h2 className={`${h2} px-4 py-4 sm:px-5`}>Services</h2>
                {c.services.length ? (
                  <>
                    <div className="hidden overflow-x-auto md:block">
                      <table className="w-full border-collapse">
                        <thead className="bg-brand-deep"><tr><th scope="col" className={`${th} w-12`}>SN</th><th scope="col" className={th}>Picture</th><th scope="col" className={th}>Service name</th><th scope="col" className={th}>Description</th><th scope="col" className={th}>Duration</th><th scope="col" className={th}>Price</th></tr></thead>
                        <tbody>
                          {c.services.map((s, n) => (
                            <tr key={s.id} className="border-t border-line">
                              <td className={`${td} tabular-nums text-ink-muted`}>{n + 1}</td>
                              <td className={td}><ServicePicture src={s.imageUrl} /></td>
                              <td className={`${td} font-display font-bold text-heading`}>{s.name}</td>
                              <td className={`${td} whitespace-pre-line`}>{s.description ?? s.remark ?? "—"}</td>
                              <td className={`${td} whitespace-nowrap`}>{s.duration ?? "—"}</td>
                              <td className={`${td} whitespace-nowrap font-semibold text-heading`}>{s.price ? (gated ? lock(s.id) : s.price) : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <ol className="divide-y divide-line border-t border-line md:hidden">
                      {c.services.map((s, n) => (
                        <li key={s.id} className="flex gap-3 p-4">
                          {s.imageUrl ? <ServicePicture src={s.imageUrl} /> : null}
                          <div className="flex min-w-0 flex-1 flex-col gap-1 text-[14px]">
                            <span className="font-display font-bold text-heading">{n + 1}. {s.name}</span>
                            {s.description ?? s.remark ? <span className="whitespace-pre-line text-ink-soft">{s.description ?? s.remark}</span> : null}
                            {s.duration ? <span className="text-ink-soft"><span className="text-ink-muted">Duration:</span> {s.duration}</span> : null}
                            {s.price ? <span className="font-semibold text-heading"><span className="font-normal text-ink-muted">Price:</span> {gated ? lock(s.id) : s.price}</span> : null}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </>
                ) : <p className="border-t border-line px-5 py-4 text-[14px] text-ink-muted">No services added yet.</p>}
              </section>

              {/* ── Jobs done ── */}
              <section id="jobs" className="scroll-mt-28 overflow-hidden rounded-2xl border border-line bg-white">
                <h2 className={`${h2} px-4 py-4 sm:px-5`}>Jobs done</h2>
                {c.projects.length ? (
                  <table className="w-full border-collapse">
                    <thead className="bg-brand-deep"><tr><th scope="col" className={`${th} w-12`}>SN</th><th scope="col" className={th}>Job</th><th scope="col" className={th}>Client</th></tr></thead>
                    <tbody>
                      {c.projects.map((j, n) => (
                        <tr key={j.id} className="border-t border-line"><td className={`${td} tabular-nums text-ink-muted`}>{n + 1}</td><td className={`${td} font-medium text-heading`}>{j.title}</td><td className={td}>{j.clientName ?? "—"}</td></tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p className="border-t border-line px-5 py-4 text-[14px] text-ink-muted">No jobs added yet.</p>}
              </section>

              {about || c.experience ? (
                <section className={card}>
                  <h2 className={h2}>About {name}</h2>
                  {about ? <p data-size="" className="whitespace-pre-line text-[14px] leading-relaxed text-ink-soft">{about}</p> : null}
                  {c.experience ? <p data-size="" className="whitespace-pre-line text-[14px] leading-relaxed text-ink-soft">{c.experience}</p> : null}
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
            <aside className="order-first flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 lg:sticky lg:top-32 lg:order-none">
              <h2 className={h2}>Talk to this expert</h2>
              <ContactButtons phone={c.phone} email={c.email} gated={gated} back={path} />
              {details.length ? (
                <dl className="flex flex-col gap-3 border-t border-line pt-4">
                  {details.map(([Glyph, label, value]) => (
                    <div key={label} className="flex min-w-0 items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-tint text-brand"><Glyph aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} /></span>
                      <span className="flex min-w-0 flex-col">
                        <dt className="text-[12px] font-medium text-ink-muted">{label}</dt>
                        <dd className="min-w-0 break-words font-display text-[14px] font-semibold text-heading">{value}</dd>
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

/** A service's picture, or nothing to see when there is none. */
function ServicePicture({ src }: { src: string | null }) {
  // eslint-disable-next-line @next/next/no-img-element -- uploaded or editor-entered address
  return src ? <img src={src} alt="" loading="lazy" className="h-14 w-20 shrink-0 rounded-lg border border-line object-cover" /> : <span className="text-ink-muted">—</span>;
}

/** Browser title, description and share picture for this page (src/lib/seo.ts). */
export const generateMetadata = ({ params }: { params: { slug: string } }) => itemMetadata("CONSULTANT", params.slug);

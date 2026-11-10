import Link from "next/link";
import { GlassSelect } from "@/components/GlassSelect";
import { BadgeCheck, MapPin, MonitorSmartphone, Search, Users } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { WishlistHeart } from "@/components/Wishlist";
import { prisma } from "@/lib/prisma";
import { directory, directoryMetadata } from "@/config/directories";
import { itemHref } from "@/lib/format";
import { searchTerms } from "@/lib/search-terms";

export const dynamic = "force-dynamic";
export const metadata = directoryMetadata("/experts");

type SP = Record<string, string | string[] | undefined>;
type Expert = Prisma.ConsultantGetPayload<{ include: { contentItem: { select: { id: true; slug: true; title: true; contentType: true; shortSummary: true; primaryCategory: { select: { name: true } } } } } }>;
const one = (v: string | string[] | undefined) => ((Array.isArray(v) ? v[0] : v) ?? "").trim();


/**
 * Experts as a grid of cards, the same layout as the business ideas (two across on phones, up to five
 * on wide screens). One search box matches names,
 * skills, towns and languages with the site's forgiving search words; specialty, district and
 * "online" narrow it. Public fields only: email and phone stay on the member profile.
 */
export default async function ExpertsPage({ searchParams }: { searchParams: SP }) {
  const d = directory("/experts");
  const q = one(searchParams.q);
  const specialty = one(searchParams.specialty);
  const district = one(searchParams.district);
  const online = one(searchParams.online) === "1";

  const all = await prisma.consultant.findMany({
    where: { contentItem: { publicationStatus: "PUBLISHED" } },
    include: {
      contentItem: {
        select: {
          id: true, slug: true, title: true, contentType: true, shortSummary: true,
          primaryCategory: { select: { name: true } },
        },
      },
    },
    orderBy: { contentItem: { publishedAt: { sort: "desc", nulls: "last" } } },
    take: 500,
  });

  // Choices come from the people listed, most common first.
  const count = (xs: string[]) => [...xs.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const specialties = count(all.flatMap((c) => c.specialties));
  const districts = count(all.map((c) => c.district).filter((x): x is string => Boolean(x)));

  const terms = searchTerms(q);
  const people = all.filter((c) => {
    if (specialty && !c.specialties.some((s) => s.toLowerCase() === specialty.toLowerCase())) return false;
    if (district && c.district?.toLowerCase() !== district.toLowerCase()) return false;
    if (online && !c.deliveryModes.some((m) => /online|remote|phone|video/i.test(m))) return false;
    if (!terms.length) return true;
    const text = [c.fullName, c.businessName, c.professionalTitle, c.contentItem.title, c.contentItem.shortSummary, c.contentItem.primaryCategory?.name, c.district, c.country, ...c.specialties, ...c.languages].filter(Boolean).join(" ").toLowerCase();
    return terms.every((variants) => variants.some((v) => text.includes(v)));
  });

  const filtering = Boolean(q || specialty || district || online);
  const link = (set: Record<string, string>) => {
    const u = new URLSearchParams();
    const base: Record<string, string> = { q, specialty, district, online: online ? "1" : "" };
    for (const [k, v] of Object.entries({ ...base, ...set })) if (v) u.set(k, v);
    const s = u.toString();
    return s ? `/experts?${s}` : "/experts";
  };

  return (
    <>
      {/* ── Header: deep brand blue band with the search front and centre ── */}
      <header className="under-header hero-glow bg-navy text-white">
        <div className="container-site flex flex-col gap-6 py-10 sm:py-14">
          <div className="flex max-w-3xl flex-col gap-3">
            <h1 className="text-hero text-[28px] sm:text-[36px] xl:text-[42px]">Find the right expert</h1>
            <p className="text-[15px] leading-relaxed text-white/75 sm:text-base">{d.text}</p>
          </div>

          <form action="/experts" role="search" className="flex w-full max-w-3xl flex-col gap-2 rounded-2xl bg-white p-2 text-ink sm:flex-row sm:items-center">
            <label className="flex min-w-0 flex-1 items-center gap-2.5 px-3">
              <Search aria-hidden className="h-5 w-5 shrink-0 text-ink-muted" />
              <span className="sr-only">Search experts</span>
              <input name="q" type="search" defaultValue={q} placeholder="Name, skill or town, e.g. “tax Kampala”" className="min-h-[48px] w-full min-w-0 bg-transparent text-base outline-none placeholder:text-ink-muted" />
            </label>
            <div className="border-t border-line px-1 pt-2 sm:w-48 sm:border-l sm:border-t-0 sm:pt-0">
              <GlassSelect name="district" label="District" defaultValue={district} icon={<MapPin className="h-4 w-4 text-ink-muted" />}
                className="min-h-[48px] rounded-xl px-2 text-sm font-medium text-heading" panelClassName="right-0 left-auto"
                options={[{ value: "", label: "Any district" }, ...districts.map(([name]) => ({ value: name, label: name }))]} />
            </div>
            {specialty ? <input type="hidden" name="specialty" value={specialty} /> : null}
            {online ? <input type="hidden" name="online" value="1" /> : null}
            <button className="btn-primary min-h-[48px] px-7 text-base">Search</button>
          </form>

          {/* Quick filters: the most common specialties, and online advice */}
          <ul aria-label="Specialties" className="flex flex-wrap gap-2">
            <li><Link href={link({ specialty: "" })} className={`inline-flex rounded-full border px-3.5 py-1.5 text-sm font-medium ${!specialty ? "border-white bg-white text-ink hover:text-ink" : "border-dotted border-white/50 text-white hover:border-solid hover:border-accent hover:bg-accent hover:text-ink"}`}>All</Link></li>
            {specialties.slice(0, 10).map(([name]) => (
              <li key={name}><Link href={link({ specialty: specialty === name ? "" : name })} aria-current={specialty === name ? "true" : undefined} className={`inline-flex rounded-full border px-3.5 py-1.5 text-sm font-medium ${specialty === name ? "border-white bg-white text-ink hover:text-ink" : "border-dotted border-white/50 text-white hover:border-solid hover:border-accent hover:bg-accent hover:text-ink"}`}>{name}</Link></li>
            ))}
            <li><Link href={link({ online: online ? "" : "1" })} className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium ${online ? "border-white bg-white text-ink hover:text-ink" : "border-dotted border-white/50 text-white hover:border-solid hover:border-accent hover:bg-accent hover:text-ink"}`}><MonitorSmartphone aria-hidden className="h-4 w-4" />Advises online</Link></li>
          </ul>
        </div>
      </header>

      <div className="bg-page">
        <div className="container-site flex flex-col gap-6 py-8 sm:py-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[15px] text-ink-soft"><strong className="font-bold text-heading">{people.length}</strong> {people.length === 1 ? "expert" : "experts"}{filtering ? " match" : ""}{specialty ? <> in <strong className="font-semibold text-heading">{specialty}</strong></> : null}{district ? <> in <strong className="font-semibold text-heading">{district}</strong></> : null}</p>
            {filtering ? <Link href="/experts" className="text-sm font-semibold">Clear search</Link> : null}
          </div>

          {people.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line-strong bg-white px-6 py-14 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-tint text-brand"><Users aria-hidden className="h-6 w-6" /></span>
              <p className="font-display text-lg font-bold text-heading">No expert matches that yet</p>
              <p className="max-w-md text-sm text-ink-muted">Try a shorter search or another district. <Link href="/contact" className="font-semibold">Tell our team who you need</Link> and we&apos;ll help you find them.</p>
            </div>
          ) : (
            <ul className="-mx-3 grid grid-cols-2 gap-2 sm:mx-0 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
              {people.map((c) => <li key={c.id}><ExpertCard expert={c} /></li>)}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

/** One expert, the same card as a business idea (IdeaCard): picture, category, name, a short description, a tinted panel and a button. */
function ExpertCard({ expert: c }: { expert: Expert }) {
  const name = (c.fullName || c.contentItem.title).replace(/^Sample:\s*/i, "");
  const href = itemHref(c.contentItem);
  const initials = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const about = c.contentItem.shortSummary ?? c.professionalTitle ?? c.businessName;
  const place = [c.district, c.country].filter(Boolean).join(", ");
  return (
    <div className="group relative flex h-full flex-col rounded-[20px] border border-line bg-white p-1.5 transition hover:-translate-y-0.5 hover:border-brand/60 hover:shadow-[0_10px_28px_rgba(21,126,194,0.12)] sm:p-2">
      <div className="relative">
        <WishlistHeart id={c.contentItem.id} className="absolute right-2 top-2 z-10" />
        <Link href={href} tabIndex={-1} aria-hidden className="relative block aspect-[4/3] overflow-hidden rounded-[14px] bg-brand-tint sm:aspect-[16/10]">
          {/* eslint-disable-next-line @next/next/no-img-element -- uploaded or editor-entered address */}
          {c.photoUrl ? <img src={c.photoUrl} alt="" loading="lazy" className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-[1.04]" /> : (
            <span className="flex h-full w-full items-center justify-center font-display text-[30px] font-extrabold text-brand/70 sm:text-[36px]">{initials}</span>
          )}
          {c.contentItem.primaryCategory ? <span className="absolute bottom-2 left-2 max-w-[calc(100%-1rem)] truncate rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-brand-dark sm:text-xs">{c.contentItem.primaryCategory.name}</span> : null}
        </Link>
      </div>
      <div className="flex flex-1 flex-col gap-2 px-1.5 pb-1.5 pt-3 sm:gap-2.5 sm:px-2 sm:pb-2">
        <Link href={href} className="font-display text-[15px] font-extrabold leading-tight tracking-[-0.01em] text-heading hover:text-brand sm:text-[16px]">{name}</Link>
        {about ? <p className="line-clamp-2 text-[12px] leading-snug text-ink-muted sm:text-[13px]">{about}</p> : null}
        {place ? <p className="flex items-center gap-1 text-[12px] text-ink-soft sm:text-[13px]"><MapPin aria-hidden className="h-3.5 w-3.5 shrink-0 text-ink-muted" /><span className="truncate">{place}</span></p> : null}
        <p className="flex items-center gap-2 rounded-xl bg-page px-2.5 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-tint text-accent-dark"><BadgeCheck aria-hidden className="h-3.5 w-3.5" /></span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-muted">Specialty</span>
            <strong className="line-clamp-2 text-[13px] font-bold text-heading">{c.specialties.join(", ") || "General advice"}</strong>
          </span>
        </p>
        <div className="mt-auto pt-1">
          <Link href={href} className="inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-full bg-brand px-3 text-[13px] font-bold text-white hover:bg-brand-dark hover:text-white sm:h-9">View profile</Link>
        </div>
      </div>
    </div>
  );
}

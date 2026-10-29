import Link from "next/link";
import { BadgeCheck, Languages, MapPin, MonitorSmartphone, Search, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { directory } from "@/config/directories";
import { date, itemHref } from "@/lib/format";
import { searchTerms } from "@/lib/search-terms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Business consultants and experts" };

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => ((Array.isArray(v) ? v[0] : v) ?? "").trim();

// Avatar colours for people without a photo, picked from the name so each person keeps theirs.
const TONES = ["bg-brand text-white", "bg-accent text-ink", "bg-[#0F766E] text-white", "bg-[#7C3AED] text-white", "bg-[#071A33] text-white", "bg-[#BE185D] text-white"];
const toneOf = (name: string) => TONES[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % TONES.length];
const initials = (name: string) => name.replace(/^sample\s+/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

/**
 * Experts as a people directory: faces first (photo, or initials until one is added), then name,
 * title, specialties and where they work. One search box matches names, skills, towns and
 * languages with the site's forgiving search words; specialty, district and "online" narrow it.
 * Public fields only: email and phone stay on the member profile.
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
          id: true, slug: true, title: true, contentType: true, shortSummary: true, lastReviewedAt: true,
          primaryCategory: { select: { name: true } },
          checks: { where: { result: "PASSED" }, select: { checkType: true } },
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
    const text = [c.fullName, c.professionalTitle, c.contentItem.title, c.contentItem.shortSummary, c.contentItem.primaryCategory?.name, c.district, c.country, ...c.specialties, ...c.languages].filter(Boolean).join(" ").toLowerCase();
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
      {/* ── Header: navy band with the search front and centre ── */}
      <header className="bg-[#071A33] text-white">
        <div className="container-site flex flex-col gap-6 py-10 sm:py-14">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] text-white/60">
            <Link href="/" className="text-white/60 hover:text-white">Home</Link><span aria-hidden>/</span><span className="text-white/90">Experts</span>
          </nav>
          <div className="flex max-w-3xl flex-col gap-3">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/[0.08] px-3 py-1 text-xs font-semibold text-white/90"><Users aria-hidden className="h-3.5 w-3.5 text-accent" />{all.length} {all.length === 1 ? "expert" : "experts"} listed</span>
            <h1 className="font-sans text-[34px] font-black leading-[1.08] tracking-[-0.02em] sm:text-[48px]">Find the right expert</h1>
            <p className="text-base leading-relaxed text-white/75 sm:text-lg">{d.text}</p>
          </div>

          <form action="/experts" role="search" className="flex w-full max-w-3xl flex-col gap-2 rounded-2xl bg-white p-2 text-ink sm:flex-row sm:items-center">
            <label className="flex min-w-0 flex-1 items-center gap-2.5 px-3">
              <Search aria-hidden className="h-5 w-5 shrink-0 text-ink-muted" />
              <span className="sr-only">Search experts</span>
              <input name="q" type="search" defaultValue={q} placeholder="Name, skill or town, e.g. “tax Kampala”" className="min-h-[48px] w-full min-w-0 bg-transparent text-base outline-none placeholder:text-ink-muted" />
            </label>
            <label className="flex items-center gap-2 border-t border-line px-3 pt-2 sm:border-l sm:border-t-0 sm:pt-0">
              <MapPin aria-hidden className="h-4 w-4 shrink-0 text-ink-muted" />
              <span className="sr-only">District</span>
              <select name="district" defaultValue={district} className="min-h-[48px] w-full bg-transparent text-sm font-medium outline-none sm:w-40">
                <option value="">Any district</option>
                {districts.map(([name]) => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>
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
              <p className="font-sans text-lg font-black text-heading">No expert matches that yet</p>
              <p className="max-w-md text-sm text-ink-muted">Try a shorter search or another district. <Link href="/contact" className="font-semibold">Tell our team who you need</Link> and we&apos;ll help you find them.</p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {people.map((c) => {
                const name = c.fullName || c.contentItem.title;
                const checked = c.contentItem.checks.length > 0;
                const remote = c.deliveryModes.some((m) => /online|remote|phone|video/i.test(m));
                return (
                  <li key={c.id}>
                    <Link href={itemHref(c.contentItem)} className="group flex h-full flex-col items-center rounded-3xl border border-line bg-white p-6 text-center text-ink transition hover:-translate-y-0.5 hover:border-brand hover:text-ink hover:shadow-[0_20px_40px_-24px_rgba(7,26,51,0.4)]">
                      <span className="relative">
                        {c.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- editor-entered photo address
                          <img src={c.photoUrl} alt={name} loading="lazy" className="h-24 w-24 rounded-full object-cover ring-4 ring-brand-tint" />
                        ) : (
                          <span aria-hidden className={`flex h-24 w-24 items-center justify-center rounded-full font-sans text-2xl font-black ring-4 ring-brand-tint ${toneOf(name)}`}>{initials(name)}</span>
                        )}
                        {checked ? <span title="Checked by BizSphere-Ug" className="absolute -bottom-0.5 -right-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-white text-brand"><BadgeCheck aria-label="Checked" className="h-6 w-6" /></span> : null}
                      </span>

                      <span className="mt-4 font-sans text-lg font-black leading-tight tracking-tight text-heading group-hover:text-brand">{name}</span>
                      <span className="mt-1 text-sm font-medium text-accent-dark">{c.professionalTitle ?? c.contentItem.primaryCategory?.name ?? "Business expert"}</span>
                      {c.contentItem.shortSummary ? <span className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-ink-muted">{c.contentItem.shortSummary}</span> : null}

                      {c.specialties.length ? (
                        <span className="mt-4 flex flex-wrap justify-center gap-1.5">
                          {c.specialties.slice(0, 3).map((s) => <span key={s} className="rounded-full bg-brand-tint px-2.5 py-1 text-xs font-semibold text-brand-dark">{s}</span>)}
                          {c.specialties.length > 3 ? <span className="rounded-full bg-page px-2.5 py-1 text-xs font-semibold text-ink-muted">+{c.specialties.length - 3}</span> : null}
                        </span>
                      ) : null}

                      <span className="mt-auto flex w-full flex-col gap-1.5 border-t border-line pt-4 text-[13px] text-ink-soft [&:not(:first-child)]:mt-5">
                        <span className="inline-flex items-center justify-center gap-1.5"><MapPin aria-hidden className="h-4 w-4 text-ink-muted" />{[c.district, c.country].filter(Boolean).join(", ") || "Location not added"}</span>
                        <span className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                          {remote ? <span className="inline-flex items-center gap-1"><MonitorSmartphone aria-hidden className="h-3.5 w-3.5" />Online</span> : null}
                          {c.languages.length ? <span className="inline-flex items-center gap-1"><Languages aria-hidden className="h-3.5 w-3.5" />{c.languages.join(", ")}</span> : null}
                          <span>Reviewed {date(c.contentItem.lastReviewedAt)}</span>
                        </span>
                      </span>
                      <span className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-full border border-line text-sm font-bold text-heading transition group-hover:border-brand group-hover:bg-brand group-hover:text-white">View profile</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

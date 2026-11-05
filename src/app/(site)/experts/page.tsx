import Link from "next/link";
import { GlassSelect } from "@/components/GlassSelect";
import { MapPin, MonitorSmartphone, Search, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { directory } from "@/config/directories";
import { itemHref } from "@/lib/format";
import { searchTerms } from "@/lib/search-terms";

export const dynamic = "force-dynamic";
export const metadata = { title: directory("/experts").title };

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => ((Array.isArray(v) ? v[0] : v) ?? "").trim();

const th = "px-4 py-3 font-semibold";
const cell = "text-[13px] text-ink-soft md:px-4 md:py-3";

/**
 * Experts as the client's template: one table of S/N, Expert Names, Business Name, Country, Category
 * and Specialty, stacking into rows on phones like the suppliers table. One search box matches names,
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
            <div className="overflow-hidden rounded-2xl border border-line bg-white">
              <table className="w-full text-left text-[14px]">
                <thead className="hidden bg-brand-deep text-xs text-white/90 md:table-header-group">
                  <tr>
                    <th className={`${th} w-14`}>S/N</th><th className={th}>Expert Names</th><th className={th}>Business Name</th>
                    <th className={th}>Country</th><th className={th}>Category</th><th className={th}>Specialty</th>
                  </tr>
                </thead>
                <tbody>
                  {people.map((c, n) => (
                    <tr key={c.id} className={`flex flex-col gap-1 border-b border-line px-4 py-3 last:border-0 md:table-row md:p-0 ${n % 2 ? "" : "md:bg-brand-tint/40"}`}>
                      <td className="hidden text-ink-muted md:table-cell md:px-4 md:py-3">{n + 1}</td>
                      <td className="md:px-4 md:py-3"><Link href={itemHref(c.contentItem)} className="font-semibold text-heading hover:text-brand">{(c.fullName || c.contentItem.title).replace(/^Sample:\s*/i, "")}</Link></td>
                      <td className={cell}>{c.businessName ?? "—"}</td>
                      <td className={cell}>{c.country ?? "—"}</td>
                      <td className={cell}>{c.contentItem.primaryCategory?.name ?? c.professionalTitle ?? "—"}</td>
                      <td className={cell}>{c.specialties.join(", ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

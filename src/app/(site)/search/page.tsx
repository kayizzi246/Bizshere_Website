import Link from "next/link";
import type { ContentType } from "@prisma/client";
import { searchContent, SEARCHABLE_TYPES } from "@/lib/search";
import { checkLabel, contentTypeLabel, contentTypePath, date, moneyRange } from "@/lib/format";
import { getViewer } from "@/lib/access";
import { Gate } from "@/components/Gate";
import { saveSearch } from "@/app/actions/member";

export const dynamic = "force-dynamic";
export const metadata = { title: "Search" };

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const many = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);

export default async function SearchPage({ searchParams }: { searchParams: SP }) {
  const q = one(searchParams.q);
  const all = one(searchParams.all);
  const phrase = one(searchParams.phrase);
  const exclude = one(searchParams.exclude);
  const adv = one(searchParams.adv) === "1" || !!(all || phrase || exclude);
  const types = [...many(searchParams.types), one(searchParams.type)].filter((t): t is ContentType => SEARCHABLE_TYPES.includes(t as ContentType));
  const updated = Number(one(searchParams.updated)) || undefined;
  const checkedOnly = one(searchParams.checked) === "1";

  const viewer = await getViewer();
  const { items } = await searchContent({ q, all, phrase, exclude, types, updatedWithinDays: updated, checkedOnly, userId: viewer.userId });

  return (
    <>
      <section className="border-b border-line bg-white">
        <form action="/search" className="container-site flex flex-col gap-4 py-7">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex min-h-[56px] flex-[1_1_480px] items-center gap-2.5 rounded-2xl border-2 border-brand bg-white px-4">
              <span className="sr-only">Search</span>
              <input name="q" type="search" defaultValue={q} placeholder="What do you want to start, find or solve?" className="w-full bg-transparent text-[17px] outline-none" />
            </label>
            <button className="btn-primary min-h-[56px] px-8 text-base">Search</button>
            <Link href={adv ? `/search?q=${encodeURIComponent(q)}` : `/search?adv=1&q=${encodeURIComponent(q)}`} className="btn-outline min-h-[56px]">
              {adv ? "Hide advanced search" : "Advanced search"}
            </Link>
          </div>

          {adv ? (
            <div className="flex flex-col gap-4 rounded-2xl border border-line bg-page p-6">
              <input type="hidden" name="adv" value="1" />
              <h2 className="text-lg font-extrabold">Advanced search</h2>
              <div className="flex flex-wrap gap-3.5">
                <label className="label flex-[1_1_260px]">All of these words<input name="all" defaultValue={all} className="input" /></label>
                <label className="label flex-[1_1_260px]">This exact phrase<input name="phrase" defaultValue={phrase} placeholder="e.g. deck oven" className="input" /></label>
                <label className="label flex-[1_1_260px]">None of these words<input name="exclude" defaultValue={exclude} placeholder="e.g. used" className="input" /></label>
              </div>
              <div className="flex flex-wrap items-end gap-3.5">
                <label className="label flex-[1_1_200px]">Updated within
                  <select name="updated" defaultValue={updated ? String(updated) : ""} className="input">
                    <option value="">Any time</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="365">Last year</option>
                  </select>
                </label>
                <label className="flex min-h-[46px] items-center gap-2 text-sm"><input type="checkbox" name="checked" value="1" defaultChecked={checkedOnly} className="h-[18px] w-[18px] accent-brand" />Checked contacts only</label>
              </div>
              <fieldset className="flex flex-wrap gap-x-5 gap-y-2">
                <legend className="mb-2 text-sm font-bold">Directories</legend>
                {SEARCHABLE_TYPES.map((t) => (
                  <label key={t} className="flex items-center gap-2 text-sm"><input type="checkbox" name="types" value={t} defaultChecked={types.includes(t)} className="h-[18px] w-[18px] accent-brand" />{contentTypeLabel[t]}</label>
                ))}
              </fieldset>
              <div className="flex justify-end gap-2.5"><Link href="/search?adv=1" className="btn-outline">Clear all</Link><button className="btn-primary">Apply filters</button></div>
            </div>
          ) : null}
        </form>
      </section>

      <div className="container-site flex flex-col gap-3.5 py-7">
        <h1 className="text-2xl font-extrabold">{q || all || phrase ? `Results for “${[q, all, phrase].filter(Boolean).join(" ")}”` : "Browse everything"}</h1>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-muted">{items.length} result{items.length === 1 ? "" : "s"}</p>
          {q || all || phrase ? (
            <form action={saveSearch} className="flex items-center gap-3 text-sm">
              <input type="hidden" name="query" value={[q, all, phrase && `"${phrase}"`, exclude && exclude.split(/\s+/).map((w) => `-${w}`).join(" ")].filter(Boolean).join(" ")} />
              {types.map((t) => <input key={t} type="hidden" name="types" value={t} />)}
              <label className="flex items-center gap-1.5"><input type="checkbox" name="alert" className="h-4 w-4 accent-brand" />Alert me to new results</label>
              <button className="btn-outline min-h-[36px] px-3">Save this search</button>
            </form>
          ) : null}
        </div>
        {items.map((i) => {
          const href = `${contentTypePath[i.contentType]}/${i.slug}`;
          const round = i.fundingProgramme?.rounds[0];
          return (
            <article key={i.id} className="card flex flex-wrap gap-4 p-5">
              <div className="flex flex-[1_1_300px] flex-col gap-1.5">
                <span className="eyebrow">{contentTypeLabel[i.contentType]}</span>
                <Link href={href} className="text-lg font-extrabold text-ink hover:text-brand">{i.title}</Link>
                {i.shortSummary ? <span className="text-sm text-ink-soft">{i.shortSummary}</span> : null}
                {i.machine ? <span className="text-sm text-ink-muted">{[i.machine.powerSource, i.machine.voltage && `${i.machine.voltage} V`, i.machine.phase && `${i.machine.phase}-phase`].filter(Boolean).join(" · ")} · {i.machine._count.offers} offer(s)</span> : null}
                {i.fundingProgramme ? <span className="text-sm capitalize text-ink-muted">{i.fundingProgramme.fundingType.toLowerCase()} · {moneyRange(i.fundingProgramme.amountMin, i.fundingProgramme.amountMax, i.fundingProgramme.currency, "Amount to be confirmed")}{round?.closesAt ? ` · closes ${date(round.closesAt)}` : ""}</span> : null}
                {i.checks.length ? <span className="badge-ok self-start">✓ {checkLabel[i.checks[0].checkType]} checked {date(i.checks[0].checkedAt)}</span> : null}
              </div>
              <div className="flex flex-col justify-center gap-2">
                {(i.contentType === "SUPPLIER" || i.contentType === "CONSULTANT") && !viewer.isMember ? (
                  <Gate compact button="Show contact" modalTitle="Subscribe to see contact details" />
                ) : (
                  <Link href={href} className="btn-primary">View details</Link>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { directory } from "@/config/directories";
import { Icon } from "@/components/Icon";
import { ServiceSearch } from "@/components/ServiceSearch";
import { IdeaPhoto, PLAN_LABEL, PLAN_ORDER } from "@/components/IdeaParts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Business ideas and plans" };

/** Business ideas: photo cards that show which budget plans each idea has. */
export default async function Page() {
  const d = directory("/business-ideas");
  const items = await prisma.contentItem.findMany({
    where: { contentType: "BUSINESS_IDEA", publicationStatus: "PUBLISHED" },
    include: {
      primaryCategory: true,
      businessIdea: { select: { businessType: true, pictureUrl: true, scenarios: { select: { level: true } }, _count: { select: { steps: true } } } },
    },
    orderBy: [{ publishedAt: "desc" }],
    take: 60,
  });

  return (
    <div className="container-site flex flex-col gap-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-2xl flex-col gap-1.5">
          <h1 className="text-3xl font-extrabold tracking-tight">{d.title}</h1>
          <p className="text-ink-muted">{d.text}</p>
        </div>
        <p className="text-sm text-ink-muted"><strong className="text-ink">{items.length}</strong> {items.length === 1 ? "plan" : "plans"} available</p>
      </div>
      <ServiceSearch tab="BUSINESS_IDEA" />

      {items.length === 0 ? <p className="card p-6 text-sm text-ink-muted">Nothing published here yet.</p> : null}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((i) => {
          const b = i.businessIdea;
          const plans = PLAN_ORDER.filter((l) => b?.scenarios.some((s) => s.level === l));
          return (
            <li key={i.id} id={i.slug}>
              <Link href={`/business-ideas/${i.slug}`} data-reveal className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white text-ink transition hover:border-ink hover:text-ink">
                <div className="relative">
                  <IdeaPhoto src={b?.pictureUrl} alt={i.title} className="aspect-[16/10] transition duration-500 group-hover:scale-[1.03]" />
                  {i.primaryCategory ? <span className="absolute left-3 top-3 rounded-md bg-white px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-ink">{i.primaryCategory.name}</span> : null}
                </div>
                <div className="flex flex-1 flex-col gap-1.5 p-4">
                  {b?.businessType ? <span className="text-xs font-semibold text-brand">{b.businessType}</span> : null}
                  <h2 className="font-sans text-base font-extrabold leading-snug tracking-tight">{i.title}</h2>
                  {i.shortSummary ? <p className="line-clamp-2 text-[13px] leading-relaxed text-ink-soft">{i.shortSummary}</p> : null}

                  <div className="mt-auto flex flex-col gap-1.5 pt-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Budget plans</span>
                    <div className="flex flex-wrap gap-1.5">
                      {plans.length ? plans.map((l) => (
                        <span key={l} className="rounded-md border border-line-strong px-2 py-0.5 text-xs font-semibold text-ink-soft">{PLAN_LABEL[l]}</span>
                      )) : <span className="text-xs text-ink-muted">Being prepared</span>}
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between border-t border-line pt-2.5 text-[13px]">
                    <span className="text-ink-muted">{b?._count.steps ? `${b._count.steps} steps to start` : "Steps coming"}</span>
                    <span className="inline-flex items-center gap-1 font-bold text-ink group-hover:text-brand">View plan <Icon name="arrow" className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

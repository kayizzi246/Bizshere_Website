import Link from "next/link";
import { ADMIN_DIRECTORIES, directoryFor } from "@/lib/content-fields";
import { DIRECTORIES as SITE_DIRECTORIES } from "@/config/directories";
import { Icon } from "@/components/Icon";
import { ContentForm } from "../ContentForm";
import { loadOptions } from "../load";
import { requireContentType, staffAccess } from "@/lib/access";
import { contentArea } from "@/lib/admin-areas";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SERVICE_STYLE } from "@/lib/service-style";

export const dynamic = "force-dynamic";
export const metadata = { title: "New content" };

const iconOf = (type: string) => SITE_DIRECTORIES.find((d) => d.type === type)?.icon ?? (type === "INVESTMENT_OPPORTUNITY" ? "funding" : "link");

export default async function NewContentPage({ searchParams }: { searchParams: { type?: string } }) {
  const user = await staffAccess();
  const choices = ADMIN_DIRECTORIES.filter((d) => user.can(contentArea(d.type)));
  if (!choices.length) redirect("/admin?denied=content");
  const dir = searchParams.type ? ADMIN_DIRECTORIES.find((d) => d.type === searchParams.type) ?? directoryFor(searchParams.type) : undefined;
  if (!dir || dir.type === "RECIPE") {
    // How many of each are live and waiting, so the team sees at a glance what is there
    const counts = await prisma.contentItem.groupBy({ by: ["contentType", "publicationStatus"], where: { contentType: { in: choices.map((d) => d.type) } }, _count: { _all: true } });
    const count = (type: string, status: string) => counts.find((c) => c.contentType === type && c.publicationStatus === status)?._count._all ?? 0;
    return (
      <>
        <div>
          <h1 className="font-display text-[24px] font-extrabold tracking-tight text-heading">What do you want to add?</h1>
          <p className="text-sm text-ink-muted">Pick one. Each colour is the same as on the website.</p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {choices.map((d) => {
            const s = SERVICE_STYLE[d.type];
            const live = count(d.type, "PUBLISHED");
            const drafts = count(d.type, "DRAFT") + count(d.type, "IN_REVIEW");
            return (
              <li key={d.type} className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-shadow hover:shadow-md" style={{ borderTop: `4px solid ${s.colour}` }}>
                <Link href={`?type=${d.type}`} className="group flex flex-1 items-center gap-4 p-5 text-ink hover:text-ink">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105" style={{ background: s.soft, color: s.colour }}><Icon name={iconOf(d.type)} className="h-6 w-6" /></span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="font-display text-[16px] font-extrabold text-heading">{s.name}</span>
                    <span className="text-[13px] leading-snug text-ink-muted">{s.what}</span>
                  </span>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-transform group-hover:scale-110" style={{ background: s.colour }} aria-hidden><Icon name="plus" className="h-4 w-4" /></span>
                </Link>
                <Link href={`/admin/content?type=${d.type}`} className="flex items-center justify-between border-t border-line px-5 py-2.5 text-[13px] font-semibold text-ink-soft hover:bg-page hover:text-heading">
                  <span>{live} live{drafts ? ` · ${drafts} not live yet` : ""}</span>
                  <span style={{ color: s.colour }}>Manage →</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </>
    );
  }
  await requireContentType(dir.type);
  const options = await loadOptions(dir.type);
  return (
    <>
      <div>
        <Link href="/admin/content/new" className="text-sm">← Add something else</Link>
        <h1 className="flex items-center gap-2.5 font-display text-[22px] font-extrabold tracking-tight text-heading">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: SERVICE_STYLE[dir.type].soft, color: SERVICE_STYLE[dir.type].colour }}><Icon name={iconOf(dir.type)} className="h-5 w-5" /></span>
          New {SERVICE_STYLE[dir.type].name.toLowerCase()}
        </h1>
        <p className="text-sm text-ink-muted">Fill in what you know. Only fields with * are needed.</p>
      </div>
      <ContentForm type={dir.type} options={options} />
    </>
  );
}

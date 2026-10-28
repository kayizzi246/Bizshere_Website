import Link from "next/link";
import { ADMIN_DIRECTORIES, directoryFor, MAIN } from "@/lib/content-fields";
import { DIRECTORIES as SITE_DIRECTORIES } from "@/config/directories";
import { Icon } from "@/components/Icon";
import { ContentForm } from "../ContentForm";
import { loadOptions } from "../load";

export const dynamic = "force-dynamic";
export const metadata = { title: "New content" };

const iconOf = (type: string) => SITE_DIRECTORIES.find((d) => d.type === type)?.icon ?? (type === "INVESTMENT_OPPORTUNITY" ? "funding" : "link");

export default async function NewContentPage({ searchParams }: { searchParams: { type?: string } }) {
  const dir = searchParams.type ? ADMIN_DIRECTORIES.find((d) => d.type === searchParams.type) ?? directoryFor(searchParams.type) : undefined;
  if (!dir || dir.type === "RECIPE") {
    return (
      <>
        <div>
          <h1 className="font-sans text-[22px] font-black tracking-tight text-heading">Add content</h1>
          <p className="text-sm text-ink-muted">Choose the directory. Machine offers, funding rounds and market prices have their own forms.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {ADMIN_DIRECTORIES.map((d) => {
            const groups = new Set(d.fields.map((f) => f.group ?? "Details"));
            return (
              <Link key={d.type} href={`?type=${d.type}`} className="group flex items-start gap-3.5 rounded-xl border border-line bg-surface p-5 text-ink hover:border-brand hover:text-ink">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-tint text-brand group-hover:bg-brand group-hover:text-white"><Icon name={iconOf(d.type)} className="h-5 w-5" /></span>
                <span className="flex flex-col gap-1">
                  <span className="font-display text-sm font-bold text-heading">{d.label}</span>
                  <span className="text-xs text-ink-muted">{d.fields.length} fields in {groups.size} groups{groups.has(MAIN) ? ", main details first" : ""}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </>
    );
  }
  const options = await loadOptions(dir.type);
  return (
    <>
      <div>
        <Link href="/admin/content/new" className="text-sm">← Choose another directory</Link>
        <h1 className="font-sans text-[22px] font-black tracking-tight text-heading">New {dir.label.toLowerCase()}</h1>
        <p className="text-sm text-ink-muted">Leave unknown values empty. Unknown is not zero. Every filled field appears on the public page.</p>
      </div>
      <ContentForm type={dir.type} options={options} />
    </>
  );
}

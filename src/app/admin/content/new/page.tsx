import Link from "next/link";
import { ADMIN_DIRECTORIES, directoryFor } from "@/lib/content-fields";
import { DIRECTORIES as SITE_DIRECTORIES } from "@/config/directories";
import { Icon } from "@/components/Icon";
import { ContentForm } from "../ContentForm";
import { loadOptions } from "../load";
import { requireContentType, staffAccess } from "@/lib/access";
import { contentArea } from "@/lib/admin-areas";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "New content" };

const iconOf = (type: string) => SITE_DIRECTORIES.find((d) => d.type === type)?.icon ?? (type === "INVESTMENT_OPPORTUNITY" ? "funding" : "link");

export default async function NewContentPage({ searchParams }: { searchParams: { type?: string } }) {
  const user = await staffAccess();
  const choices = ADMIN_DIRECTORIES.filter((d) => user.can(contentArea(d.type)));
  if (!choices.length) redirect("/admin?denied=content");
  const dir = searchParams.type ? ADMIN_DIRECTORIES.find((d) => d.type === searchParams.type) ?? directoryFor(searchParams.type) : undefined;
  if (!dir || dir.type === "RECIPE") {
    return (
      <>
        <div>
          <h1 className="font-display text-[22px] font-extrabold tracking-tight text-heading">Add content</h1>
          <p className="text-sm text-ink-muted">What would you like to add?</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {choices.map((d) => {
            return (
              <Link key={d.type} href={`?type=${d.type}`} className="group flex items-start gap-3.5 rounded-xl border border-line bg-surface p-6 text-ink hover:border-brand hover:text-ink">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-tint text-brand group-hover:bg-brand group-hover:text-white"><Icon name={iconOf(d.type)} className="h-5 w-5" /></span>
                <span className="self-center font-display text-sm font-bold text-heading">{d.label}</span>
              </Link>
            );
          })}
        </div>
      </>
    );
  }
  await requireContentType(dir.type);
  const options = await loadOptions(dir.type);
  return (
    <>
      <div>
        <Link href="/admin/content/new" className="text-sm">← Choose another directory</Link>
        <h1 className="font-display text-[22px] font-extrabold tracking-tight text-heading">New {dir.label.toLowerCase()}</h1>
        <p className="text-sm text-ink-muted">Fill in what you know and leave the rest empty. Fields marked * are required.</p>
      </div>
      <ContentForm type={dir.type} options={options} />
    </>
  );
}

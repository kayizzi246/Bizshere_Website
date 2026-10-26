import Link from "next/link";
import { DIRECTORIES, directoryFor } from "@/lib/content-fields";
import { ContentForm } from "../ContentForm";
import { loadOptions } from "../load";

export const dynamic = "force-dynamic";
export const metadata = { title: "New content" };

export default async function NewContentPage({ searchParams }: { searchParams: { type?: string } }) {
  const dir = searchParams.type ? directoryFor(searchParams.type) : undefined;
  if (!dir) {
    return (
      <>
        <h1 className="text-3xl font-extrabold tracking-tight">Add content</h1>
        <p className="text-sm text-ink-muted">Choose the directory. Machine offers, funding rounds and prices have their own forms.</p>
        <div className="flex flex-wrap gap-3">
          {DIRECTORIES.map((d) => (
            <Link key={d.type} href={`?type=${d.type}`} className="card flex-[1_1_220px] p-5 font-bold text-ink hover:border-brand hover:text-ink">{d.label}</Link>
          ))}
        </div>
      </>
    );
  }
  const options = await loadOptions(dir.type);
  return (
    <>
      <div>
        <Link href="/admin/content/new" className="text-sm">← Choose another directory</Link>
        <h1 className="text-3xl font-extrabold tracking-tight">New {dir.label.toLowerCase()}</h1>
        <p className="text-sm text-ink-muted">Leave unknown values empty. Unknown is not zero.</p>
      </div>
      <ContentForm type={dir.type} options={options} />
    </>
  );
}

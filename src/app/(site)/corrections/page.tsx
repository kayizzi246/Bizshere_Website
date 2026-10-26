import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { CorrectionForm } from "./CorrectionForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Report a correction" };

export default async function CorrectionsPage({ searchParams }: { searchParams: { item?: string } }) {
  const [session, item] = await Promise.all([
    getSession(),
    searchParams.item ? prisma.contentItem.findFirst({ where: { id: searchParams.item, publicationStatus: "PUBLISHED" }, select: { id: true, title: true } }) : null,
  ]);
  return (
    <div className="container-site flex max-w-3xl flex-col gap-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight">Report a correction</h1>
        <p className="text-ink-soft">Seen a wrong price, a closed deadline or a broken contact? Tell us. Please include where the correct information comes from.</p>
        <p className="text-sm text-ink-muted">How we check and correct information: <Link href="/methodology">content methodology</Link>.</p>
      </div>
      <CorrectionForm item={item} signedIn={!!session} />
    </div>
  );
}

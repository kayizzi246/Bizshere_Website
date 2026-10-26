import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { OfferForm } from "./OfferForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Add a machine offer" };

export default async function NewOfferPage({ searchParams }: { searchParams: { q?: string; machine?: string } }) {
  const q = searchParams.q?.trim();
  const machines = await prisma.machine.findMany({
    where: { contentItem: { publicationStatus: "PUBLISHED", ...(q ? { title: { contains: q, mode: "insensitive" } } : {}) } },
    include: { contentItem: true, _count: { select: { offers: { where: { status: "PUBLISHED" } } } } },
    orderBy: { contentItem: { title: "asc" } },
    take: 20,
  });

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm text-ink-muted"><Link href="/business">My listings</Link> / New offer</span>
        <h1 className="text-3xl font-extrabold tracking-tight">Add a machine offer</h1>
        <span className="text-ink-muted">Your offer is checked by our editors before it goes live.</span>
      </div>
      <form className="card flex flex-wrap items-end gap-3 p-5">
        <label className="label flex-[1_1_300px]">Search the machine catalogue<input name="q" defaultValue={q} placeholder="e.g. deck oven" className="input" /></label>
        <button className="btn-outline">Search</button>
      </form>
      <OfferForm
        defaultMachine={searchParams.machine}
        machines={machines.map((m) => ({ id: m.id, name: m.contentItem.title, meta: [m.powerSource, m.voltage && `${m.voltage} V`, m.phase && `${m.phase}-phase`].filter(Boolean).join(" · "), sellers: m._count.offers }))}
      />
    </>
  );
}

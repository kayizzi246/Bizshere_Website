import Link from "next/link";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { addSupplierLogin, removeSupplierLogin, setSupplierPassword } from "@/app/actions/supplier";

export const dynamic = "force-dynamic";
export const metadata = { title: "Supplier logins" };

const SAVED: Record<string, string> = {
  "1": "Login added. The PIN was sent by SMS.",
  pin: "A new PIN was sent by SMS.",
  "pin-not-sent": "Saved, but the SMS could not be sent. Check the SMS settings (EgoSMS), then use \"Text new PIN\".",
  removed: "Login removed.",
};

/**
 * Who can sign in to the supplier portal (/supplier) for each supplier: a phone number and a
  * 4-digit PIN texted to them. They sign in at /suppliers/login and manage the photo and catalog.
 */
export default async function SupplierLoginsPage({ searchParams }: { searchParams: { saved?: string; error?: string } }) {
  await requireRole(["EDITOR", "ADMIN"]);
  const suppliers = await prisma.supplier.findMany({
    include: {
      contentItem: { select: { title: true, slug: true } },
      organization: { include: { members: { include: { user: { select: { id: true, phone: true, name: true } } } } } },
      _count: { select: { listings: true } },
    },
    orderBy: { contentItem: { title: "asc" } },
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold text-heading">Supplier logins</h1>
        <p className="text-sm text-ink-muted">Add a seller&apos;s phone number. We text them a 4-digit PIN; they sign in at <strong>/suppliers/login</strong>, choose their own PIN, and add products and a photo to their page. A seller who forgets their PIN can reset it by SMS, or you can text them a new one here.</p>
      </div>
      {searchParams.saved ? <p role="status" className="rounded-lg bg-brand-tint px-4 py-2.5 text-sm font-semibold text-brand-dark">{SAVED[searchParams.saved] ?? "Saved."}</p> : null}
      {searchParams.error ? <p role="alert" className="rounded-lg bg-bad-bg px-4 py-2.5 text-sm font-semibold text-bad-fg">Enter a valid phone number, e.g. 0772 123 456.</p> : null}

      <div className="flex flex-col gap-3">
        {suppliers.map((s) => (
          <section key={s.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-heading">{s.contentItem.title}</span>
              <span className="flex gap-3 text-xs text-ink-muted"><span>{s._count.listings} products</span><Link href={`/suppliers/${s.contentItem.slug}`} className="font-semibold">View page</Link></span>
            </div>
            {s.organization.members.length ? (
              <ul className="flex flex-wrap gap-2">
                {s.organization.members.map((m) => (
                  <li key={m.userId} className="flex items-center gap-2 rounded-full border border-line bg-page py-1 pl-3 pr-1 text-sm">
                    {m.user.phone ?? m.user.name ?? "Account"}
                    <form action={setSupplierPassword} className="flex items-center gap-1">
                      <input type="hidden" name="userId" value={m.userId} />
                      <button className="rounded-full px-2 py-0.5 text-xs font-bold text-brand hover:bg-brand-tint">Text new PIN</button>
                    </form>
                    <form action={removeSupplierLogin}>
                      <input type="hidden" name="userId" value={m.userId} /><input type="hidden" name="organizationId" value={s.organizationId} />
                      <button className="rounded-full px-2 py-0.5 text-xs font-bold text-bad-fg hover:bg-bad-bg" aria-label={`Remove ${m.user.phone ?? "login"}`}>Remove</button>
                    </form>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-ink-muted">No login yet.</p>}
            <form action={addSupplierLogin} className="flex flex-wrap gap-2">
              <input type="hidden" name="supplierId" value={s.id} />
              <input name="phone" type="tel" inputMode="tel" placeholder="Supplier phone, e.g. 0772 123 456" required className="input min-h-[42px] flex-1 text-sm sm:max-w-xs" />
              <button className="btn-primary min-h-[42px] px-4 text-sm">Add login</button>
            </form>
          </section>
        ))}
      </div>
    </div>
  );
}

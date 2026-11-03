import Link from "next/link";
import { requireArea } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { loginUrl, personalUrl } from "@/lib/pin-accounts";
import { CopyLink } from "@/components/CopyLink";
import { addSupplierLogin, makeSupplierLink, removeSupplierLogin, setSupplierPassword } from "@/app/actions/supplier";

export const dynamic = "force-dynamic";
export const metadata = { title: "Supplier logins" };

const SAVED: Record<string, string> = {
  "1": "Login added. The PIN and their personal sign-in link were sent by SMS.",
  pin: "A new PIN was sent by SMS.",
  "pin-not-sent": "Saved, but the SMS could not be sent. Check the SMS settings (EgoSMS), then use \"Text new PIN\".",
  link: "Personal sign-in link made.",
  removed: "Login removed.",
};
const ERROR: Record<string, string> = {
  phone: "Enter a valid phone number, e.g. 0772 123 456.",
  staff: "That phone belongs to a staff account. Use the seller's own phone.",
};

/**
 * Who can sign in to the seller portal (/supplier) for each supplier. Adding a phone texts a
 * 4-digit PIN and gives the seller a personal sign-in address (the site address followed by their
 * username), shown here to copy. They can also sign in at /suppliers/login with phone and PIN.
 */
export default async function SupplierLoginsPage({ searchParams }: { searchParams: { saved?: string; error?: string; q?: string } }) {
  await requireArea("suppliers");
  const q = searchParams.q?.trim();
  const suppliers = await prisma.supplier.findMany({
    where: q ? { contentItem: { title: { contains: q, mode: "insensitive" } } } : undefined,
    include: {
      contentItem: { select: { title: true, slug: true } },
      organization: { include: { members: { include: { user: { select: { id: true, phone: true, name: true, username: true } } } } } },
      _count: { select: { listings: true } },
    },
    orderBy: { contentItem: { title: "asc" } },
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold text-heading">Supplier logins</h1>
        <p className="text-sm text-ink-muted">Add a seller&apos;s phone number. We text them a 4-digit PIN and their personal sign-in link; they choose their own PIN on first sign-in, then add products and a photo. They can also sign in at <strong>{loginUrl("supplier").replace(/^https?:\/\//, "")}</strong>. Add the supplier itself first under Content → Trusted Suppliers.</p>
      </div>
      {searchParams.saved ? <p role="status" className="rounded-lg bg-brand-tint px-4 py-2.5 text-sm font-semibold text-brand-dark">{SAVED[searchParams.saved] ?? "Saved."}</p> : null}
      {searchParams.error ? <p role="alert" className="rounded-lg bg-bad-bg px-4 py-2.5 text-sm font-semibold text-bad-fg">{ERROR[searchParams.error] ?? ERROR.phone}</p> : null}
      <form className="flex gap-2"><input name="q" defaultValue={q} placeholder="Find a supplier" className="input min-h-[42px] w-full max-w-xs text-sm" /><button className="btn-outline min-h-[42px] px-4 text-sm">Search</button></form>

      <div className="flex flex-col gap-3">
        {suppliers.length === 0 ? <p className="rounded-2xl border border-dashed border-line-strong bg-surface px-5 py-8 text-center text-sm text-ink-muted">No suppliers{q ? " match" : " yet"}.</p> : null}
        {suppliers.map((s) => {
          const name = s.contentItem.title.replace(/^Sample:\s*/i, "");
          return (
            <section key={s.id} className="flex min-w-0 flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-heading">{s.contentItem.title}</span>
                <span className="flex gap-3 text-xs text-ink-muted"><span>{s._count.listings} products</span><Link href={`/suppliers/${s.contentItem.slug}`} className="font-semibold">View page</Link></span>
              </div>
              {s.organization.members.length ? (
                <ul className="flex flex-col gap-2">
                  {s.organization.members.map((m) => (
                    <li key={m.userId} className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-page px-3 py-2 text-sm">
                      <span className="font-semibold text-heading">{m.user.phone ?? m.user.name ?? "Account"}</span>
                      {m.user.username ? <CopyLink url={personalUrl(m.user.username)} /> : (
                        <form action={makeSupplierLink}>
                          <input type="hidden" name="userId" value={m.userId} /><input type="hidden" name="name" value={name} />
                          <button className="rounded-full px-2 py-0.5 text-xs font-bold text-brand hover:bg-brand-tint">Make sign-in link</button>
                        </form>
                      )}
                      <span className="ml-auto flex items-center gap-1">
                        <form action={setSupplierPassword}>
                          <input type="hidden" name="userId" value={m.userId} /><input type="hidden" name="name" value={name} />
                          <button className="rounded-full px-2 py-0.5 text-xs font-bold text-brand hover:bg-brand-tint">Text new PIN</button>
                        </form>
                        <form action={removeSupplierLogin}>
                          <input type="hidden" name="userId" value={m.userId} /><input type="hidden" name="organizationId" value={s.organizationId} />
                          <button className="rounded-full px-2 py-0.5 text-xs font-bold text-bad-fg hover:bg-bad-bg" aria-label={`Remove ${m.user.phone ?? "login"}`}>Remove</button>
                        </form>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-ink-muted">No login yet.</p>}
              <form action={addSupplierLogin} className="flex flex-wrap gap-2">
                <input type="hidden" name="supplierId" value={s.id} />
                <input name="phone" type="tel" inputMode="tel" placeholder="Seller's phone, e.g. 0772 123 456" required className="input min-h-[42px] flex-1 text-sm sm:max-w-xs" />
                <button className="btn-primary min-h-[42px] px-4 text-sm">Add login</button>
              </form>
            </section>
          );
        })}
      </div>
    </div>
  );
}

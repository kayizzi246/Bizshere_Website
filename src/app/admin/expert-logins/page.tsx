import Link from "next/link";
import { requireArea } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { loginUrl, personalUrl } from "@/lib/pin-accounts";
import { CopyLink } from "@/components/CopyLink";
import { addExpertLogin, makeExpertLink, removeExpertLogin, setExpertPin } from "@/app/actions/expert";

export const dynamic = "force-dynamic";
export const metadata = { title: "Expert logins" };

const SAVED: Record<string, string> = {
  "1": "Login added. The PIN and their personal sign-in link were sent by SMS.",
  pin: "A new PIN was sent by SMS.",
  "pin-not-sent": "Saved, but the SMS could not be sent. Check the SMS settings (EgoSMS), then use \"Text new PIN\".",
  link: "Personal sign-in link made.",
  removed: "Login removed. The expert's page stays as it is.",
};
const ERROR: Record<string, string> = {
  phone: "Enter a valid phone number, e.g. 0772 123 456.",
  staff: "That phone belongs to a staff account. Use the expert's own phone.",
  taken: "That phone already signs in for another expert.",
};

/**
 * Who can sign in to the expert portal (/expert) for each expert. Adding a phone texts a 4-digit
 * PIN and gives the expert a personal sign-in address, shown here to copy. One login per expert.
 */
export default async function ExpertLoginsPage({ searchParams }: { searchParams: { saved?: string; error?: string; q?: string } }) {
  await requireArea("experts");
  const q = searchParams.q?.trim();
  const experts = await prisma.consultant.findMany({
    where: q ? { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { contentItem: { title: { contains: q, mode: "insensitive" } } }] } : undefined,
    include: {
      contentItem: { select: { slug: true, publicationStatus: true } },
      owner: { select: { id: true, phone: true, username: true } },
      _count: { select: { projects: { where: { status: "IN_REVIEW" } } } },
    },
    orderBy: { fullName: "asc" },
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold text-heading">Expert logins</h1>
        <p className="text-sm text-ink-muted">Add an expert&apos;s phone number. We text them a 4-digit PIN and their personal sign-in link; they choose their own PIN on first sign-in, then keep their profile and links up to date and add their work (approve it in <Link href="/admin/expert-work" className="font-semibold">Expert work</Link>). They can also sign in at <strong>{loginUrl("expert").replace(/^https?:\/\//, "")}</strong>. Add the expert itself first under Content → Business Experts.</p>
      </div>
      {searchParams.saved ? <p role="status" className="rounded-lg bg-brand-tint px-4 py-2.5 text-sm font-semibold text-brand-dark">{SAVED[searchParams.saved] ?? "Saved."}</p> : null}
      {searchParams.error ? <p role="alert" className="rounded-lg bg-bad-bg px-4 py-2.5 text-sm font-semibold text-bad-fg">{ERROR[searchParams.error] ?? ERROR.phone}</p> : null}
      <form className="flex gap-2"><input name="q" defaultValue={q} placeholder="Find an expert" className="input min-h-[42px] w-full max-w-xs text-sm" /><button className="btn-outline min-h-[42px] px-4 text-sm">Search</button></form>

      <div className="grid gap-3 xl:grid-cols-2">
        {experts.length === 0 ? <p className="rounded-2xl border border-dashed border-line-strong bg-surface px-5 py-8 text-center text-sm text-ink-muted xl:col-span-2">No experts{q ? " match" : " yet"}.</p> : null}
        {experts.map((x) => (
          <section key={x.id} className="flex min-w-0 flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex flex-col">
                <span className="font-bold text-heading">{x.fullName}</span>
                <span className="text-xs text-ink-muted">{x.professionalTitle ?? "Expert"}{x.contentItem.publicationStatus !== "PUBLISHED" ? ` · ${x.contentItem.publicationStatus.toLowerCase().replace("_", " ")}` : ""}</span>
              </span>
              <span className="flex gap-3 text-xs text-ink-muted">
                {x._count.projects ? <Link href="/admin/expert-work" className="font-semibold text-accent-dark">{x._count.projects} work to approve</Link> : null}
                <Link href={`/experts/${x.contentItem.slug}`} className="font-semibold">View page</Link>
              </span>
            </div>
            {x.owner ? (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-page px-3 py-2 text-sm">
                <span className="font-semibold text-heading">{x.owner.phone ?? "Account"}</span>
                {x.owner.username ? <CopyLink url={personalUrl(x.owner.username)} /> : (
                  <form action={makeExpertLink}><input type="hidden" name="consultantId" value={x.id} /><button className="rounded-full px-2 py-0.5 text-xs font-bold text-brand hover:bg-brand-tint">Make sign-in link</button></form>
                )}
                <span className="ml-auto flex items-center gap-1">
                  <form action={setExpertPin}><input type="hidden" name="consultantId" value={x.id} /><button className="rounded-full px-2 py-0.5 text-xs font-bold text-brand hover:bg-brand-tint">Text new PIN</button></form>
                  <form action={removeExpertLogin}><input type="hidden" name="consultantId" value={x.id} /><button className="rounded-full px-2 py-0.5 text-xs font-bold text-bad-fg hover:bg-bad-bg">Remove</button></form>
                </span>
              </div>
            ) : (
              <form action={addExpertLogin} className="flex flex-wrap gap-2">
                <input type="hidden" name="consultantId" value={x.id} />
                <input name="phone" type="tel" inputMode="tel" placeholder="Expert's phone, e.g. 0772 123 456" required className="input min-h-[42px] flex-1 text-sm sm:max-w-xs" />
                <button className="btn-primary min-h-[42px] px-4 text-sm">Add login</button>
              </form>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

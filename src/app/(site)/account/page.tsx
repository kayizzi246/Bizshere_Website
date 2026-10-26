import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { contentTypeLabel, date, itemHref } from "@/lib/format";
import { addToCollection, createCollection, deleteCollection, deleteSavedSearch, markAlertsRead, removeFromCollection, toggleSave } from "@/app/actions/member";

export const dynamic = "force-dynamic";
export const metadata = { title: "My account" };

export default async function AccountPage() {
  const viewer = await getViewer();
  if (!viewer.userId) redirect("/login?callbackUrl=/account");
  const userId = viewer.userId;

  const [user, saved, collections, searches, alerts, calculations] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { subscriptions: { include: { plan: true }, orderBy: { startedAt: "desc" }, take: 1 } } }),
    prisma.savedItem.findMany({ where: { userId }, include: { contentItem: true }, orderBy: { createdAt: "desc" } }),
    prisma.collection.findMany({ where: { userId }, include: { items: { include: { contentItem: true } } }, orderBy: { createdAt: "asc" } }),
    prisma.savedSearch.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.alert.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.toolCalculation.findMany({ where: { userId }, include: { toolVersion: { include: { tool: { include: { contentItem: true } } } } }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  const sub = user.subscriptions[0];
  const unread = alerts.filter((a) => !a.readAt).length;

  return (
    <div className="container-site flex flex-col gap-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">My account</h1>
          <p className="text-ink-muted">{user.name} · {user.email}</p>
        </div>
        <div className="card flex items-center gap-4 px-5 py-3">
          <span className="flex flex-col text-sm">
            <span className="font-bold">{viewer.isMember ? "Member" : "Free account"}{sub ? ` · ${sub.plan.name}` : ""}</span>
            <span className="text-ink-muted">{sub?.currentPeriodEnd ? `Renews or ends ${date(sub.currentPeriodEnd)}` : viewer.isMember ? "" : "Previews only"}</span>
          </span>
          {!viewer.isMember ? <Link href="/membership" className="btn-primary">Upgrade</Link> : null}
        </div>
      </div>

      <section className="card flex flex-col gap-3 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold">Alerts {unread ? <span className="badge-warn ml-1">{unread} new</span> : null}</h2>
          {unread ? <form action={markAlertsRead}><button className="btn-outline min-h-[36px] px-3">Mark all read</button></form> : null}
        </div>
        {alerts.length === 0 ? <p className="text-sm text-ink-muted">No alerts yet. Save funding programmes or searches to get deadline and update alerts.</p> : alerts.map((a) => (
          <div key={a.id} className={`flex flex-wrap justify-between gap-2 border-t border-line pt-3 ${a.readAt ? "text-ink-muted" : ""}`}>
            <span className="flex flex-col"><span className="font-bold">{a.link ? <Link href={a.link}>{a.title}</Link> : a.title}</span>{a.body ? <span className="text-sm">{a.body}</span> : null}</span>
            <span className="text-xs text-ink-muted">{date(a.createdAt)}</span>
          </div>
        ))}
      </section>

      <div className="flex flex-wrap items-start gap-6">
        <section className="card flex min-w-0 flex-[2_1_520px] flex-col gap-3 p-6">
          <h2 className="text-xl font-extrabold">Saved ({saved.length})</h2>
          {saved.length === 0 ? <p className="text-sm text-ink-muted">Use ☆ Save on any page to keep it here.</p> : saved.map((s) => (
            <div key={s.contentItemId} className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
              <span className="flex flex-col">
                <Link href={itemHref(s.contentItem)} className="font-bold">{s.contentItem.title}</Link>
                <span className="text-xs text-ink-muted">{contentTypeLabel[s.contentItem.contentType]} · saved {date(s.createdAt)}{s.contentItem.updatedAt > s.createdAt ? " · updated since you saved it" : ""}</span>
              </span>
              <span className="flex flex-wrap gap-2">
                {collections.length ? (
                  <form action={addToCollection} className="flex gap-1.5">
                    <input type="hidden" name="contentItemId" value={s.contentItemId} />
                    <select name="collectionId" aria-label="Collection" className="input min-h-[36px] text-sm">{collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                    <button className="btn-outline min-h-[36px] px-3">Add</button>
                  </form>
                ) : null}
                <form action={toggleSave}><input type="hidden" name="contentItemId" value={s.contentItemId} /><input type="hidden" name="back" value="/account" /><button className="btn-outline min-h-[36px] px-3">Remove</button></form>
              </span>
            </div>
          ))}
        </section>

        <section className="card flex min-w-0 flex-[1_1_340px] flex-col gap-3 p-6">
          <h2 className="text-xl font-extrabold">Collections</h2>
          <p className="text-sm text-ink-muted">Group what you need for one plan, e.g. &ldquo;Bakery in Mukono&rdquo;.</p>
          <form action={createCollection} className="flex gap-2">
            <input name="name" required maxLength={80} placeholder="New collection name" aria-label="New collection name" className="input min-h-[40px] flex-1" />
            <button className="btn-primary min-h-[40px]">Create</button>
          </form>
          {collections.map((c) => (
            <details key={c.id} className="rounded-xl border border-line p-3">
              <summary className="cursor-pointer font-bold">{c.name} <span className="font-normal text-ink-muted">({c.items.length})</span></summary>
              <ul className="mt-2 flex flex-col gap-1.5 text-sm">
                {c.items.map((i) => (
                  <li key={i.contentItemId} className="flex justify-between gap-2">
                    <Link href={itemHref(i.contentItem)}>{i.contentItem.title}</Link>
                    <form action={removeFromCollection}><input type="hidden" name="collectionId" value={c.id} /><input type="hidden" name="contentItemId" value={i.contentItemId} /><button aria-label={`Remove ${i.contentItem.title}`} className="text-ink-muted">×</button></form>
                  </li>
                ))}
              </ul>
              <form action={deleteCollection} className="mt-2"><input type="hidden" name="id" value={c.id} /><button className="text-xs font-bold text-bad-fg">Delete collection</button></form>
            </details>
          ))}
        </section>
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <section className="card flex min-w-0 flex-[1_1_420px] flex-col gap-3 p-6">
          <h2 className="text-xl font-extrabold">Saved searches</h2>
          {searches.length === 0 ? <p className="text-sm text-ink-muted">Run a search and choose &ldquo;Save this search&rdquo;.</p> : searches.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 border-t border-line pt-3">
              <Link href={`/search?q=${encodeURIComponent(s.query)}`} className="font-bold">{s.query || "All content"}</Link>
              <span className="flex items-center gap-2 text-xs text-ink-muted">{s.alert ? <span className="badge-info">Alerts on</span> : null}<form action={deleteSavedSearch}><input type="hidden" name="id" value={s.id} /><button className="font-bold text-bad-fg">Delete</button></form></span>
            </div>
          ))}
        </section>
        <section className="card flex min-w-0 flex-[1_1_420px] flex-col gap-3 p-6">
          <h2 className="text-xl font-extrabold">Saved calculations</h2>
          {calculations.length === 0 ? <p className="text-sm text-ink-muted">Results you save from calculators appear here, tied to the rule version used.</p> : calculations.map((c) => (
            <div key={c.id} className="flex justify-between gap-3 border-t border-line pt-3 text-sm">
              <Link href={itemHref(c.toolVersion.tool.contentItem)} className="font-bold">{c.label ?? c.toolVersion.tool.contentItem.title}</Link>
              <span className="text-ink-muted">rules v{c.toolVersion.versionNumber} · {date(c.createdAt)}</span>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

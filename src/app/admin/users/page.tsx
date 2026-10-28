import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { date, money } from "@/lib/format";
import { changeRole, createAccount, setSuspended } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Users and businesses" };

const TABS: [string, string][] = [["all", "All"], ["member", "Members"], ["business", "Businesses"], ["pending", "Pending"], ["staff", "Staff"]];
const DISTRICTS = ["Kampala", "Wakiso", "Mukono", "Jinja", "Mbarara", "Gulu", "Mbale", "Arua", "Masaka", "Lira"];

export default async function UsersPage({ searchParams }: { searchParams: { tab?: string; q?: string; user?: string; create?: string; created?: string; error?: string } }) {
  const tab = TABS.some(([t]) => t === searchParams.tab) ? searchParams.tab! : "all";
  const q = searchParams.q?.trim();
  const where: Prisma.UserWhereInput = {
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] } : {}),
    ...(tab === "member" ? { role: "USER" } : {}),
    ...(tab === "business" ? { role: "CONTRIBUTOR" } : {}),
    ...(tab === "staff" ? { role: { in: ["EDITOR", "ADMIN"] } } : {}),
    ...(tab === "pending" ? { orgMemberships: { some: { organization: { status: "PENDING" } } } } : {}),
  };
  const users = await prisma.user.findMany({
    where,
    include: { orgMemberships: { include: { organization: { include: { subscriptions: { include: { plan: true }, take: 1, orderBy: { startedAt: "desc" } } } } } }, subscriptions: { include: { plan: true }, take: 1, orderBy: { startedAt: "desc" } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const selectedId = searchParams.user ?? searchParams.created ?? users[0]?.id;
  const sel = selectedId
    ? await prisma.user.findUnique({ where: { id: selectedId }, include: { orgMemberships: { include: { organization: true } }, subscriptions: { include: { plan: true, payments: { orderBy: { createdAt: "desc" }, take: 3 } }, orderBy: { startedAt: "desc" } } } })
    : null;
  const qs = (extra: Record<string, string>) => "?" + new URLSearchParams({ tab, ...(q ? { q } : {}), ...extra }).toString();

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="font-sans text-[22px] font-black tracking-tight text-heading">Users and businesses</h1><p className="text-sm text-ink-muted">Members, business accounts and staff</p></div>
        <Link href={qs({ create: "1" })} className="btn-primary">+ Create account</Link>
      </div>

      {searchParams.created ? <div role="status" className="rounded-xl bg-brand-tint px-4 py-3 font-bold text-brand-dark">Account created. Send them a password-set link (email sending is not wired up yet).</div> : null}

      {searchParams.create ? (
        <form action={createAccount} className="card flex flex-col gap-4 border-2 border-brand p-6">
          <div className="flex items-center justify-between"><div><h2 className="text-xl font-extrabold">Create an account</h2><p className="text-sm text-ink-muted">For a business that asked to join by phone or in person, or for a new staff member.</p></div><Link href={qs({})} aria-label="Close" className="text-xl text-ink">×</Link></div>
          {searchParams.error ? <p role="alert" className="text-sm font-semibold text-bad-fg">{searchParams.error === "exists" ? "An account with that email already exists." : "Check the fields and try again."}</p> : null}
          <div className="flex flex-wrap gap-3.5">
            <label className="label flex-[1_1_220px]">Account type
              <select name="kind" className="input">
                <option value="MACHINE_DEALER">Business: machine dealer</option><option value="SUPPLIER">Business: supplier</option><option value="CONSULTANCY">Business: consultant or expert</option><option value="FUNDING_PROVIDER">Business: funding provider</option><option value="SERVICE_PROVIDER">Business: service provider</option><option value="MEMBER">Member</option><option value="EDITOR">Staff: editor</option><option value="ADMIN">Staff: admin</option>
              </select>
            </label>
            <label className="label flex-[2_1_280px]">Business name (for business accounts)<input name="orgName" className="input" /></label>
          </div>
          <div className="flex flex-wrap gap-3.5">
            <label className="label flex-[1_1_220px]">Contact person<input name="name" required className="input" /></label>
            <label className="label flex-[1_1_220px]">Email<input name="email" type="email" required className="input" /></label>
            <label className="label flex-[1_1_220px]">Phone<input name="phone" type="tel" placeholder="+256" className="input" /></label>
            <label className="label flex-[1_1_180px]">District<select name="district" className="input">{DISTRICTS.map((d) => <option key={d}>{d}</option>)}</select></label>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="sendToReview" defaultChecked className="h-[18px] w-[18px] accent-brand" />Send business to the review queue for verification checks</label>
          <div className="flex justify-end gap-2.5"><Link href={qs({})} className="btn-outline">Cancel</Link><button className="btn-primary">Create account</button></div>
        </form>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0"><div role="tablist" className="inline-flex gap-0.5 rounded-full border border-line bg-surface p-1">
          {TABS.map(([t, l]) => <Link key={t} role="tab" aria-selected={tab === t} href={`?tab=${t}`} className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] ${tab === t ? "bg-brand-deep font-semibold text-white hover:text-white" : "font-medium text-ink-soft hover:bg-page hover:text-heading"}`}>{l}</Link>)}
        </div></div>
        <form className="flex w-full gap-2 sm:w-auto"><input type="hidden" name="tab" value={tab} /><input name="q" defaultValue={q} placeholder="Name, email or phone" className="input min-h-[40px] min-w-0 flex-1 sm:w-64 sm:flex-none" /><button className="btn-outline min-h-[42px]">Search</button></form>
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <section className="card min-w-0 flex-[999_1_560px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-base min-w-[680px]">
              <thead><tr><th>Name</th><th>Type</th><th>Plan</th><th>Status</th><th>Joined</th></tr></thead>
              <tbody>
                {users.map((u) => {
                  const org = u.orgMemberships[0]?.organization;
                  const plan = org?.subscriptions[0]?.plan.name ?? u.subscriptions[0]?.plan.name ?? "Free";
                  const status = u.isSuspended ? ["badge-bad", "Suspended"] : org?.status === "PENDING" ? ["badge-warn", "Pending verification"] : ["badge-ok", "Active"];
                  return (
                    <tr key={u.id} className={u.id === selectedId ? "bg-brand-tint" : ""}>
                      <td><Link href={qs({ user: u.id })} className="flex flex-col text-ink"><span className="font-bold">{org?.legalName ?? u.name}</span><span className="text-xs text-ink-muted">{u.email ?? u.phone}</span></Link></td>
                      <td className="capitalize">{org ? org.accountType.toLowerCase().replace("_", " ") : u.role.toLowerCase()}</td>
                      <td>{plan}</td>
                      <td><span className={status[0]}>{status[1]}</span></td>
                      <td className="text-ink-muted">{date(u.createdAt)}</td>
                    </tr>
                  );
                })}
                {users.length === 0 ? <tr><td colSpan={5} className="text-ink-muted">No accounts match.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>

        {sel ? (
          <aside className="card flex flex-[1_1_320px] flex-col gap-4 p-5">
            <div className="flex flex-col"><span className="text-lg font-extrabold">{sel.name}</span><span className="text-sm text-ink-muted">{sel.email ?? sel.phone} · joined {date(sel.createdAt)}</span></div>
            <div className="flex flex-col gap-2 text-sm">
              <Row k="Phone" v={sel.phone ?? "—"} />
              <Row k="Business" v={sel.orgMemberships[0]?.organization.legalName ?? "—"} />
              <Row k="Plan" v={sel.subscriptions[0]?.plan.name ?? "Free"} />
              <Row k="Renews" v={date(sel.subscriptions[0]?.currentPeriodEnd)} />
              <Row k="Last active" v={date(sel.lastActiveAt)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-extrabold">Recent payments</span>
              {sel.subscriptions.flatMap((s) => s.payments).map((p) => (
                <div key={p.id} className="flex justify-between border-t border-line py-2 text-sm"><span>{date(p.paidAt ?? p.createdAt)} · {p.method.replace("_", " ")}</span><span className="font-bold">{money(p.amount, p.currency)}</span></div>
              ))}
              {sel.subscriptions.every((s) => s.payments.length === 0) ? <span className="text-sm text-ink-muted">No payments.</span> : null}
            </div>
            <form action={changeRole} className="flex items-end gap-2">
              <input type="hidden" name="id" value={sel.id} />
              <label className="label flex-1 text-xs">Role<select name="role" defaultValue={sel.role} className="input min-h-[42px]"><option value="USER">Member / visitor</option><option value="CONTRIBUTOR">Business owner</option><option value="EDITOR">Editor</option><option value="ADMIN">Admin</option></select></label>
              <button className="btn-outline min-h-[42px]">Save</button>
            </form>
            <form action={setSuspended}>
              <input type="hidden" name="id" value={sel.id} /><input type="hidden" name="suspend" value={sel.isSuspended ? "0" : "1"} />
              <button className={sel.isSuspended ? "btn-outline w-full" : "btn-danger w-full"}>{sel.isSuspended ? "Restore account" : "Suspend account"}</button>
            </form>
          </aside>
        ) : null}
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-2.5"><span className="text-ink-muted">{k}</span><span className="font-semibold">{v}</span></div>;
}

import Link from "next/link";
import { ShieldCheck, UserCog } from "lucide-react";
import { requireAdmin } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { date } from "@/lib/format";
import { site } from "@/config/site";
import { areaLabel } from "@/lib/admin-areas";
import { AreaPicker } from "./AreaPicker";
import { addSubAdmin, removeStaff, saveAreas, sendTestSms, setStaffPassword, setStaffSuspended, setStaffPhone, setSuperAdmin, signOutAllDevices } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin team" };

const SAVED: Record<string, string> = {
  added: "Added. We texted them an invitation. They log in with their number, get a code by SMS and choose their password. Their card is open below.",
  "added-no-sms": "Added, but the invitation SMS could not be sent. Check SMS below, then tell them to log in with their number.",
  "added-password": "Added. Give them the sign-in address, their email or phone, and the password you set.",
  "sms-ok": "EgoSMS accepted the test SMS. If it doesn't arrive in a minute or two, the delay is on the EgoSMS or phone network side.",
  areas: "Areas saved. They apply straight away.",
  password: "Password changed.",
  phone: "Phone saved. They can use it to log in and to reset a forgotten password.",
  suspended: "Account suspended. They are signed out within a few minutes.",
  restored: "Account restored.",
  role: "Role changed.",
  removed: "Admin access removed. The account is now an ordinary user.",
  signedout: "Everyone is being signed out on every device, you too, within 5 minutes. Sign in again with the staff link.",
};
const ERROR: Record<string, string> = {
  invalid: "Check the name and email.",
  password: "That password is too short or too easy to guess. Use at least 6 digits or letters.",
  "needs-phone": "Add their phone number so they can set a password by SMS, or set a password for them.",
  already: "That person is already on the team.",
  "sms-busy": "That's a lot of test messages. Please wait a while.",
  "sms-failed": "The test SMS could not be sent.",
  phone: "Enter a valid phone number, e.g. 0772 123 456.",
  contact: "Give an email or a phone number to sign in with.",
  exists: "That email and that phone belong to two different accounts. Use one of them.",
  areas: "Choose what they may do: tap a quick choice, tick at least one area, or choose Everything.",
  self: "You can't change your own account here.",
  super: "Super admins open every area. Make them a sub-admin first to choose areas.",
  missing: "That account isn't on the team any more.",
  confirm: "Tick the box to confirm signing everyone out.",
};

/**
 * The admin team (super admin only). Sub-admins manage only the areas ticked for them; every page
 * and action checks this on the server, and their menu shows only those areas. Super admins open
 * everything, including this page, membership prices and permanent deletes.
 */
export default async function TeamPage({ searchParams }: { searchParams: { why?: string; add?: string; saved?: string; error?: string; user?: string } }) {
  const me = await requireAdmin();
  const staff = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "EDITOR"] } },
    select: { id: true, name: true, email: true, phone: true, role: true, adminAreas: true, isSuspended: true, lastActiveAt: true, createdAt: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
  const signIn = `${site.url.replace(/\/$/, "")}/admin`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-extrabold text-heading">Admin team</h1>
          <p className="max-w-3xl text-sm text-ink-muted">Add people to help run the site. Type their name and phone number, choose what they may do, and they get a text to sign in at <strong>{signIn.replace(/^https?:\/\//, "")}</strong>.</p>
        </div>
      </div>
      {searchParams.saved ? <p role="status" className="rounded-lg bg-brand-tint px-4 py-2.5 text-sm font-semibold text-brand-dark">{SAVED[searchParams.saved] ?? "Saved."}</p> : null}
      {searchParams.error && !searchParams.add ? <p role="alert" className="rounded-lg bg-bad-bg px-4 py-2.5 text-sm font-semibold text-bad-fg">{ERROR[searchParams.error] ?? ERROR.invalid}</p> : null}

      {/* Always on the page (client, 11 Nov 2026: adding an admin as easy as possible): who, then what they may do */}
      <form action={addSubAdmin} className="flex flex-col gap-5 rounded-2xl border-2 border-brand/40 bg-surface p-5">
        <h2 className="text-lg font-extrabold text-heading">Add a team member</h2>
        {searchParams.error && searchParams.add ? <p role="alert" className="rounded-lg bg-bad-bg px-4 py-2.5 text-sm font-semibold text-bad-fg">{ERROR[searchParams.error] ?? ERROR.invalid}</p> : null}
        <div className="flex flex-col gap-2">
          <span className="flex items-center gap-2 font-bold text-heading"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-[13px] text-white">1</span>Who is it?</span>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="label">Their name<input name="name" autoComplete="off" placeholder="e.g. Sarah Namuli" className="input min-h-[48px]" /></label>
            <label className="label">Their phone number<input name="phone" type="tel" autoComplete="off" placeholder="0772 123 456" className="input min-h-[48px]" /><span className="text-xs font-normal text-ink-muted">We text them an invitation. They choose their own password.</span></label>
          </div>
          <details className="text-sm [&>summary::-webkit-details-marker]:hidden">
            <summary className="cursor-pointer list-none font-semibold text-brand">+ No phone? Use an email and set a password instead</summary>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <label className="label">Email<input name="email" type="email" autoComplete="off" className="input" /></label>
              <label className="label">Password you set for them<input name="password" type="text" autoComplete="off" placeholder="Leave empty: they choose their own by SMS" className="input" /></label>
            </div>
          </details>
        </div>
        <div className="flex flex-col gap-2">
          <span className="flex items-center gap-2 font-bold text-heading"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-[13px] text-white">2</span>What may they do?</span>
          <AreaPicker chosen={[]} withSuper />
        </div>
        <button className="btn-primary min-h-[50px] w-full px-7 text-[15px] sm:w-fit">Add to the team</button>
      </form>

      {searchParams.why ? <p role="alert" className="rounded-lg bg-bad-bg px-4 py-2.5 text-sm font-semibold text-bad-fg">{searchParams.why.slice(0, 200)}</p> : null}
      <form action={sendTestSms} className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-line bg-surface p-4">
        <span className="flex min-w-[14rem] flex-1 flex-col gap-0.5"><span className="font-bold text-heading">Text messages</span><span className="text-sm text-ink-muted">Log-in codes and invitations go by SMS. Send a test to any number to make sure they work.</span></span>
        <label className="label">Phone number<input name="phone" type="tel" required defaultValue={staff.find((u) => u.id === me.id)?.phone ?? ""} placeholder="0772 123 456" className="input min-h-[42px]" /></label>
        <button className="btn-outline min-h-[42px] px-4 text-sm">Send test SMS</button>
      </form>

      <div className="flex flex-col gap-0.5">
        <h2 className="text-lg font-extrabold text-heading">The team ({staff.length})</h2>
        <p className="text-sm text-ink-muted">Tap a person to change what they may do, their phone or password, or to remove them.</p>
      </div>
      <ul className="flex flex-col gap-3">
        {staff.map((u) => {
          const isMe = u.id === me.id;
          const isSuper = u.role === "ADMIN";
          return (
            <li key={u.id} className={`rounded-2xl border bg-surface ${searchParams.user === u.id ? "border-brand" : "border-line"}`}>
              <details open={searchParams.user === u.id}>
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isSuper ? "bg-accent text-ink" : "bg-brand-tint text-brand"}`}>{isSuper ? <ShieldCheck aria-hidden className="h-5 w-5" /> : <UserCog aria-hidden className="h-5 w-5" />}</span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-bold text-heading">{u.name}{isMe ? " (you)" : ""}</span>
                    <span className="truncate text-xs text-ink-muted">{[u.email, u.phone].filter(Boolean).join(" · ")} · last active {date(u.lastActiveAt)}</span>
                  </span>
                  <span className="flex flex-wrap items-center gap-1.5">
                    {u.isSuspended ? <span className="badge-bad">Suspended</span> : null}
                    {/* Sign-in needs password + SMS code only when the account has a phone (src/lib/auth.ts) */}
                    {u.phone ? <span className="badge-info">SMS code at sign-in</span> : <span className="badge-warn" title="Add a phone number so signing in also needs a texted code">Password only: add a phone</span>}
                    <span className={isSuper ? "badge-warn" : "badge-info"}>{isSuper ? "Super admin" : `Sub-admin · ${u.adminAreas.length} area${u.adminAreas.length === 1 ? "" : "s"}`}</span>
                  </span>
                </summary>
                <div className="flex flex-col gap-4 border-t border-line p-4">
                  {isSuper ? (
                    <p className="text-sm text-ink-muted">Opens every area, this page, membership prices and permanent deletes.</p>
                  ) : (
                    <p className="text-sm text-ink-muted">Manages: {u.adminAreas.map(areaLabel).join(", ") || "nothing yet"}.</p>
                  )}
                  {isMe ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-sm text-ink-muted">This is you. Another super admin can change your account.</p>
                      {u.phone ? null : (
                        <form action={setStaffPhone} className="flex flex-wrap items-end gap-2">
                          <input type="hidden" name="id" value={u.id} />
                          <label className="label text-xs">Add your phone, so signing in also needs a texted code<input name="phone" type="tel" required placeholder="0772 123 456" autoComplete="tel" className="input min-h-[42px]" /></label>
                          <button className="btn-primary min-h-[42px]">Add phone</button>
                        </form>
                      )}
                    </div>
                  ) : (
                    <>
                      {!isSuper ? (
                        <form action={saveAreas} className="flex flex-col gap-3">
                          <input type="hidden" name="id" value={u.id} />
                          <AreaPicker chosen={u.adminAreas} />
                          <button className="btn-primary w-fit">Save what they may do</button>
                        </form>
                      ) : null}
                      <div className="flex flex-wrap items-end gap-3 border-t border-line pt-4">
                        <form action={setStaffPassword} className="flex flex-wrap items-end gap-2">
                          <input type="hidden" name="id" value={u.id} />
                          <label className="label text-xs">New password<input name="password" type="text" minLength={10} required autoComplete="off" className="input min-h-[42px]" /></label>
                          <button className="btn-outline min-h-[42px]">Set password</button>
                        </form>
                        <form action={setStaffPhone} className="flex flex-wrap items-end gap-2">
                          <input type="hidden" name="id" value={u.id} />
                          <label className="label text-xs">Phone for sign-in codes<input name="phone" type="tel" required defaultValue={u.phone ?? ""} placeholder="0772 123 456" autoComplete="off" className="input min-h-[42px]" /></label>
                          <button className="btn-outline min-h-[42px]">Save phone</button>
                        </form>
                        <form action={setSuperAdmin}>
                          <input type="hidden" name="id" value={u.id} /><input type="hidden" name="super" value={isSuper ? "0" : "1"} />
                          <button className="btn-outline min-h-[42px]">{isSuper ? "Make sub-admin" : "Make super admin"}</button>
                        </form>
                        <form action={setStaffSuspended}>
                          <input type="hidden" name="id" value={u.id} /><input type="hidden" name="suspend" value={u.isSuspended ? "0" : "1"} />
                          <button className={u.isSuspended ? "btn-outline min-h-[42px]" : "btn-danger min-h-[42px]"}>{u.isSuspended ? "Restore" : "Suspend"}</button>
                        </form>
                        <form action={removeStaff}>
                          <input type="hidden" name="id" value={u.id} />
                          <button className="btn-outline min-h-[42px] text-bad-fg" title="They lose all admin access. Their account and history stay.">Remove from team</button>
                        </form>
                      </div>
                    </>
                  )}
                </div>
              </details>
            </li>
          );
        })}
      </ul>

      {/* Security: end every session at once (src/lib/sessions.ts) */}
      <section className="flex flex-col gap-3 rounded-2xl border border-bad-fg/30 bg-surface p-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-extrabold text-heading">Sign everyone out</h2>
          <p className="max-w-3xl text-sm text-ink-muted">Ends every session on every phone and computer: members, sellers, experts and staff, you too. Use it if a device was lost or a password shared. Accounts, memberships and payments are kept: people simply sign in again (members with their phone number, staff with the staff link). Takes effect within 5 minutes.</p>
        </div>
        <form action={signOutAllDevices} className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-ink">
            <input type="checkbox" name="confirm" value="yes" required className="h-4 w-4 accent-brand" />
            I understand everyone, including me, will have to sign in again
          </label>
          <button className="inline-flex h-10 items-center rounded-[10px] bg-[#C7362B] px-4 text-sm font-semibold text-white hover:bg-[#A82C23]">Sign everyone out</button>
        </form>
      </section>
    </div>
  );
}

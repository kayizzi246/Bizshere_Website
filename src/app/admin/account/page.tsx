import { staffAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { changeMyPassword, saveMyEmail, saveMyName } from "@/app/actions/staff-account";
import { PhoneChange, SignOutNow } from "@/components/StaffAccount";

export const dynamic = "force-dynamic";
export const metadata = { title: "My account" };

const SAVED: Record<string, string> = { name: "Your name is saved.", email: "Your email is changed. Use it next time you log in." };
const ERROR: Record<string, string> = {
  name: "Enter your name.",
  email: "Enter a valid email address.",
  "email-taken": "That email is on another account.",
  current: "Your current password is not correct.",
  short: "Your new password needs at least 6 digits or letters.",
  easy: "That password is too easy to guess. Choose another.",
  match: "Enter the same new password twice.",
  busy: "Too many tries. Please wait a while and try again.",
};

/** Each team member's own small dashboard: their name, email, phone and password. */
export default async function MyAccountPage({ searchParams }: { searchParams: { saved?: string; error?: string } }) {
  const staff = await staffAccess();
  const me = await prisma.user.findUniqueOrThrow({ where: { id: staff.id }, select: { name: true, email: true, phone: true } });
  const card = "flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5";
  const h2 = "font-bold text-heading";

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold text-heading">My account</h1>
        <p className="text-sm text-ink-muted">{staff.superAdmin ? "Super admin" : "Sub-admin"}. Your details for logging in to the admin.</p>
      </div>
      {searchParams.saved === "password" ? <SignOutNow /> : null}
      {searchParams.saved && SAVED[searchParams.saved] ? <p role="status" className="rounded-lg bg-brand-tint px-4 py-2.5 text-sm font-semibold text-brand-dark">{SAVED[searchParams.saved]}</p> : null}
      {searchParams.error && ERROR[searchParams.error] ? <p role="alert" className="rounded-lg bg-bad-bg px-4 py-2.5 text-sm font-semibold text-bad-fg">{ERROR[searchParams.error]}</p> : null}

      <section className={card}>
        <h2 className={h2}>Name</h2>
        <form action={saveMyName} className="flex flex-wrap items-end gap-3">
          <label className="label min-w-[14rem] flex-1">Your name<input name="name" required minLength={2} maxLength={120} defaultValue={me.name} className="input" /></label>
          <button className="btn-primary min-h-[44px] px-5 text-sm">Save</button>
        </form>
      </section>

      <section className={card}>
        <h2 className={h2}>Email</h2>
        <form action={saveMyEmail} className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="label">Email<input name="email" type="email" required defaultValue={me.email ?? ""} autoComplete="off" className="input" /></label>
            <label className="label">Current password<input name="current" type="password" required autoComplete="current-password" className="input" /></label>
          </div>
          <button className="btn-primary min-h-[44px] w-fit px-5 text-sm">Change email</button>
        </form>
      </section>

      <section className={card}>
        <h2 className={h2}>Phone number</h2>
        <PhoneChange phone={me.phone} />
      </section>

      <section className={card}>
        <h2 className={h2}>Password</h2>
        <form action={changeMyPassword} className="flex flex-col gap-3">
          <label className="label sm:max-w-[50%]">Current password<input name="current" type="password" required autoComplete="current-password" className="input" /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="label">New password<input name="next" type="password" required minLength={6} autoComplete="new-password" className="input" /></label>
            <label className="label">New password again<input name="confirm" type="password" required minLength={6} autoComplete="new-password" className="input" /></label>
          </div>
          <p className="text-xs text-ink-muted">At least 6 digits or letters. You will be logged out everywhere and log in again with the new password.</p>
          <button className="btn-primary min-h-[44px] w-fit px-5 text-sm">Change password</button>
        </form>
      </section>
    </div>
  );
}

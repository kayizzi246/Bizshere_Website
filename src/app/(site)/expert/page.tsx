import Link from "next/link";
import { redirect } from "next/navigation";
import { Briefcase, CheckCircle2, Clock, ExternalLink, FileText, Link2, Plus, Settings, Trash2, UserRound, XCircle } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UploadButton } from "@/components/UploadButton";
import { SignOutButton } from "@/components/SignOutButton";
import { ChoosePin } from "@/components/ChoosePin";
import { changeMyPin } from "@/app/actions/pin";
import { addService, deleteService, deleteWork, saveExpertProfile, saveWork } from "@/app/actions/expert";
import { site } from "@/config/site";
import { partnerAccess } from "@/lib/partners";

export const dynamic = "force-dynamic";
export const metadata = { title: "Expert dashboard", robots: { index: false } };

const NOTICE: Record<string, string> = {
  paid: "Payment received. Our team will check your details, and your page goes live once approved.",
  password: "Your PIN is changed.",
  profile: "Your details are saved and show on your page.",
  service: "Service added. It shows on your page.",
  "service-removed": "Service removed.",
  "work-added": "Job sent. It shows on your page once our team approves it.",
  "work-updated": "Changes sent. The job shows again once our team approves them.",
  "work-deleted": "Job removed.",
};
const ERROR: Record<string, string> = {
  password: "Enter the same 4-digit PIN twice.",
  access: "You can only change your own profile.",
  profile: "Check your details: the email must be valid, and links and photos must start with https:// (or use Upload).",
  service: "Check the service: it needs a name.",
  links: "Each extra link goes on its own line and starts with https://.",
  work: "Check the job: it needs a name, the year must be a number, and links must start with https://.",
};

// What each work status means to the expert, in plain words.
const STATUS = {
  PUBLISHED: { label: "On your page", cls: "bg-[#E6F4EC] text-[#1F7A4D]", Icon: CheckCircle2 },
  IN_REVIEW: { label: "Waiting for approval", cls: "bg-accent-tint text-accent-dark", Icon: Clock },
  ARCHIVED: { label: "Not approved", cls: "bg-bad-bg text-bad-fg", Icon: XCircle },
  DRAFT: { label: "Draft", cls: "bg-page text-ink-soft", Icon: Clock },
} as const;

/**
 * Expert dashboard (/expert): an expert signs in at /experts/login (phone and PIN) or at their
 * personal address. They keep their profile and website links up to date, and add their work
 * (photo, file, link), shown once the team approves it at /admin/expert-work. Access comes from
 * the admin linking their phone to the expert (/admin/expert-logins); actions check it again.
 */
export default async function ExpertPortal({ searchParams }: { searchParams: { saved?: string; error?: string } }) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/experts/login");
  const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { pinMustChange: true } });
  if (me?.pinMustChange) return <ChoosePin back="/expert" error={searchParams.error === "password"} />;
  // Registered themselves and not paid, or not renewed. Experts the team added have no listing plan.
  if ((await partnerAccess(session.user.id, "expert")).mustPay) redirect("/experts/join");
  const expert = await prisma.consultant.findUnique({
    where: { ownerId: session.user.id },
    include: { contentItem: { select: { slug: true, shortSummary: true, overview: true } }, projects: { orderBy: { createdAt: "desc" } }, services: { orderBy: { name: "asc" } } },
  });

  const signOut = <span className="w-32"><SignOutButton to="/expert" className="border border-line bg-white text-ink-soft hover:border-brand" /></span>;
  if (!expert) {
    return (
      <div className="bg-page"><div className="container-site py-8">
        <section className="mx-auto flex max-w-lg flex-col gap-3 rounded-2xl border border-line bg-white p-5">
          <h1 className="font-display text-xl font-extrabold text-heading">This account isn&apos;t registered as an expert</h1>
          <p className="text-sm text-ink-soft">Call us to be listed as a business expert. If you already have an expert sign-in, sign out and sign in with your expert phone and PIN.</p>
          <span className="flex flex-wrap items-center gap-3">
            {site.contact.phone ? <a href={`tel:${site.contact.phone.replace(/\s/g, "")}`} className="btn-primary min-h-[42px] px-4 text-sm">Call {site.contact.phone}</a> : <Link href="/contact" className="btn-primary min-h-[42px] px-4 text-sm">Contact us</Link>}
            {signOut}
          </span>
        </section>
      </div></div>
    );
  }

  const input = "input min-h-[44px] w-full text-[14px]";
  const label = "flex flex-col gap-1 text-[13px] font-semibold text-ink-soft";
  const count = (st: string) => expert.projects.filter((p) => p.status === st).length;
  const statusOf = (s: string) => STATUS[(s in STATUS ? s : "IN_REVIEW") as keyof typeof STATUS];

  return (
    <div className="bg-page">
      <div className="container-site flex flex-col gap-5 py-5 sm:py-7">
        {searchParams.saved && NOTICE[searchParams.saved] ? <p role="status" className="rounded-xl bg-brand-tint px-4 py-3 text-sm font-semibold text-brand-dark">{NOTICE[searchParams.saved]}</p> : null}
        {searchParams.error && ERROR[searchParams.error] ? <p role="alert" className="rounded-xl bg-bad-bg px-4 py-3 text-sm font-semibold text-bad-fg">{ERROR[searchParams.error]}</p> : null}

        {/* ── Who and where ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element -- uploaded or entered address */}
              {expert.photoUrl ? <img src={expert.photoUrl} alt="" className="h-full w-full object-cover" /> : <UserRound aria-hidden className="h-6 w-6 text-brand/40" />}
            </span>
            <span className="flex flex-col">
              <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">Expert dashboard</span>
              <h1 className="font-display text-[24px] font-extrabold leading-tight tracking-[-0.02em] text-heading sm:text-[28px]">{expert.fullName}</h1>
              {expert.professionalTitle ? <span className="text-[13px] text-ink-muted">{expert.professionalTitle}</span> : null}
            </span>
          </div>
          <span className="flex items-center gap-2">
            <Link href={`/experts/${expert.contentItem.slug}`} className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-line bg-white px-4 text-sm font-semibold text-heading hover:border-brand hover:text-brand"><ExternalLink aria-hidden className="h-4 w-4" />View my page</Link>
            {signOut}
          </span>
        </div>

        {/* ── At a glance ── */}
        <ul className="grid grid-cols-3 gap-2 sm:gap-3">
          {(["PUBLISHED", "IN_REVIEW", "ARCHIVED"] as const).map((st) => {
            const { label: l, cls, Icon } = STATUS[st];
            return (
              <li key={st} className="flex flex-col gap-1 rounded-2xl border border-line bg-white p-3 sm:p-4">
                <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold sm:text-[12px] ${cls}`}><Icon aria-hidden className="h-3.5 w-3.5" />{l}</span>
                <span className="font-display text-[26px] font-extrabold text-heading">{count(st)}</span>
              </li>
            );
          })}
        </ul>
        <p className="-mt-2 text-[13px] text-ink-muted">How it works: add a job → our team checks it → it shows on your page. Your details and services show straight away.</p>

        {/* ── My details: the top of my page ── */}
        <details className="rounded-2xl border border-line bg-white p-4" open={!expert.address && !expert.website}>
          <summary className="flex cursor-pointer list-none items-center gap-2 font-display text-base font-extrabold text-heading [&::-webkit-details-marker]:hidden"><UserRound aria-hidden className="h-4 w-4 text-brand" />My details</summary>
          <form action={saveExpertProfile} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className={`${label} sm:col-span-2`}>Photo or logo
              <input name="photoUrl" defaultValue={expert.photoUrl ?? ""} placeholder="Upload, or paste an https:// address" className={input} />
            </label>
            <div className="sm:col-span-2"><UploadButton target="photoUrl" kind="image" /></div>
            <label className={label}>Business name<input name="businessName" defaultValue={expert.businessName ?? ""} className={input} /></label>
            <label className={label}>Your title<input name="professionalTitle" defaultValue={expert.professionalTitle ?? ""} placeholder="e.g. Tax consultant" className={input} /></label>
            <label className={`${label} sm:col-span-2`}>Physical address<input name="address" defaultValue={expert.address ?? ""} placeholder="e.g. Plot 12, Kampala Road, 2nd floor" className={input} /></label>
            <label className={label}>Phone (members only)<input name="phone" type="tel" defaultValue={expert.phone ?? ""} className={input} /></label>
            <label className={label}>Email (members only)<input name="email" type="email" defaultValue={expert.email ?? ""} className={input} /></label>
            <label className={label}>Country<input name="country" defaultValue={expert.country ?? ""} className={input} /></label>
            <label className={label}>District<input name="district" defaultValue={expert.district ?? ""} placeholder="e.g. Wakiso" className={input} /></label>
            <label className={label}>Website<input name="website" type="url" defaultValue={expert.website ?? ""} placeholder="https://" className={input} /></label>
            <label className={label}>Specialty (comma between)<input name="specialties" defaultValue={expert.specialties.join(", ")} className={input} /></label>
            <label className={`${label} sm:col-span-2`}>Profile to download (members only)
              <input name="profileUrl" defaultValue={expert.profileUrl ?? ""} placeholder="Upload, or paste an https:// address" className={input} />
            </label>
            <div className="sm:col-span-2"><UploadButton target="profileUrl" kind="file" /></div>
            <button className="btn-primary min-h-[44px] px-5 text-sm sm:col-span-2 sm:w-fit">Save my details</button>
          </form>
        </details>

        {/* ── My services: the Services table on my page ── */}
        <section className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4">
          <h2 className="font-display text-base font-extrabold text-heading">My services ({expert.services.length})</h2>
          {expert.services.length ? (
            <ul className="flex flex-col gap-2">
              {expert.services.map((s) => (
                <li key={s.id} className="flex items-center gap-3 rounded-xl bg-page px-3 py-2 text-[14px]">
                  <span className="min-w-0 flex-1"><span className="font-semibold text-heading">{s.name}</span>{s.price ? <span className="text-ink-soft"> · {s.price}</span> : null}{s.remark ? <span className="text-ink-muted"> · {s.remark}</span> : null}</span>
                  <form action={deleteService}><input type="hidden" name="id" value={s.id} /><button aria-label={`Remove ${s.name}`} className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:text-bad-fg"><Trash2 aria-hidden className="h-4 w-4" /></button></form>
                </li>
              ))}
            </ul>
          ) : null}
          <form key={expert.services.length} action={addService} className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
            <label className={label}>Service<input name="name" required minLength={2} maxLength={160} placeholder="e.g. Bee keeping training" className={input} /></label>
            <label className={label}>Price<input name="price" maxLength={80} placeholder="e.g. UGX 200,000" className={input} /></label>
            <label className={label}>Remark<input name="remark" maxLength={200} className={input} /></label>
            <button className="btn-primary min-h-[44px] px-5 text-sm">Add</button>
          </form>
        </section>

        {/* ── Add work ── */}
        <details className="group rounded-2xl border border-line bg-white p-4" open={expert.projects.length === 0}>
          <summary className="flex cursor-pointer list-none items-center gap-2 font-display text-base font-extrabold text-brand [&::-webkit-details-marker]:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white"><Plus aria-hidden className="h-4 w-4" /></span>Add a job
          </summary>
          <WorkForm input={input} label={label} />
        </details>

        {/* ── My work ── */}
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-extrabold text-heading">Jobs done ({expert.projects.length})</h2>
          {expert.projects.length === 0 ? <p className="text-sm text-ink-muted">No jobs yet. Add your first one above.</p> : null}
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {expert.projects.map((w) => {
              const st = statusOf(w.status);
              return (
                <li key={w.id} className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white">
                  <div className="relative flex aspect-[16/10] items-center justify-center bg-page">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {w.imageUrl ? <img src={w.imageUrl} alt="" className="h-full w-full object-cover" /> : <Briefcase aria-hidden className="h-8 w-8 text-brand/40" />}
                    <span className={`absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${st.cls}`}><st.Icon aria-hidden className="h-3 w-3" />{st.label}</span>
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5 p-3">
                    <span className="line-clamp-2 text-[14px] font-semibold text-heading">{w.title}</span>
                    {w.clientName || w.year ? <span className="text-[12px] text-ink-muted">{[w.clientName, w.year].filter(Boolean).join(" · ")}</span> : null}
                    <span className="flex flex-wrap gap-3 text-[12px] font-semibold">
                      {w.fileUrl ? <a href={w.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1"><FileText aria-hidden className="h-3.5 w-3.5" />File</a> : null}
                      {w.linkUrl ? <a href={w.linkUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1"><Link2 aria-hidden className="h-3.5 w-3.5" />Link</a> : null}
                    </span>
                    <details className="mt-auto pt-1">
                      <summary className="cursor-pointer list-none text-[13px] font-semibold text-brand [&::-webkit-details-marker]:hidden">Edit</summary>
                      <WorkForm work={w} input={input} label={label} />
                    </details>
                    <form action={deleteWork}>
                      <input type="hidden" name="id" value={w.id} />
                      <button className="inline-flex items-center gap-1 text-[12px] font-semibold text-bad-fg"><Trash2 aria-hidden className="h-3.5 w-3.5" />Remove</button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* ── Settings: PIN ── */}
        <details className="rounded-2xl border border-line bg-white p-4">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-ink-soft [&::-webkit-details-marker]:hidden"><Settings aria-hidden className="h-4 w-4" />Settings: my PIN</summary>
          <form action={changeMyPin} className="mt-4 flex max-w-sm flex-col gap-2">
            <input type="hidden" name="back" value="/expert" />
            <label className={label}>New 4-digit PIN<input name="password" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required autoComplete="new-password" className={`${input} tracking-[0.5em]`} /></label>
            <label className={label}>Repeat it<input name="confirm" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required autoComplete="new-password" className={`${input} tracking-[0.5em]`} /></label>
            <button className="btn-primary min-h-[40px] w-fit px-4 text-sm">Change PIN</button>
          </form>
        </details>
      </div>
    </div>
  );
}

function WorkForm({ work, input, label }: {
  work?: { id: string; title: string; clientName: string | null; year: number | null; summary: string | null; outcome: string | null; imageUrl: string | null; fileUrl: string | null; linkUrl: string | null };
  input: string;
  label: string;
}) {
  return (
    <form action={saveWork} className="mt-3 grid gap-3 sm:grid-cols-2">
      {work ? <input type="hidden" name="id" value={work.id} /> : null}
      <label className={`${label} sm:col-span-2`}>Job<input name="title" required defaultValue={work?.title} placeholder="e.g. Business plan for a poultry farm" className={input} /></label>
      <label className={label}>Client<input name="clientName" defaultValue={work?.clientName ?? ""} className={input} /></label>
      <label className={label}>Year<input name="year" inputMode="numeric" maxLength={4} defaultValue={work?.year ?? ""} className={input} /></label>
      <label className={`${label} sm:col-span-2`}>What you did<textarea name="summary" rows={3} defaultValue={work?.summary ?? ""} className="input w-full py-2 text-[14px]" /></label>
      <label className={`${label} sm:col-span-2`}>Result (optional)<input name="outcome" defaultValue={work?.outcome ?? ""} placeholder="e.g. Loan of UGX 40m approved" className={input} /></label>
      <label className={label}>Photo
        <input name="imageUrl" defaultValue={work?.imageUrl ?? ""} placeholder="Upload, or an https:// address" className={input} />
      </label>
      <label className={label}>File (PDF or document)
        <input name="fileUrl" defaultValue={work?.fileUrl ?? ""} placeholder="Upload, or an https:// address" className={input} />
      </label>
      <UploadButton target="imageUrl" kind="image" />
      <UploadButton target="fileUrl" kind="file" />
      <label className={`${label} sm:col-span-2`}>Link (website, article or video)<input name="linkUrl" type="url" defaultValue={work?.linkUrl ?? ""} placeholder="https://" className={input} /></label>
      <button className="btn-primary min-h-[44px] px-5 text-sm sm:col-span-2 sm:w-fit">{work ? "Save and send for approval" : "Send for approval"}</button>
    </form>
  );
}

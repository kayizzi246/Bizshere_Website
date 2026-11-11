import Link from "next/link";
import { redirect } from "next/navigation";
import { Briefcase, CheckCircle2, Clock, FileText, KeyRound, Link2, Plus, Trash2, UserRound, XCircle } from "lucide-react";
import { DashCard, DashHero, DashNotice, DashSteps } from "@/components/PartnerDash";
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
 * Redesigned on 11 Nov 2026 (client: premium and very easy): a dark header with the expert's numbers
 * (PartnerDash), how it works in three steps, then two columns: services and jobs done on the left, the
 * expert's details and PIN on the right.
 *
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
    include: { contentItem: { select: { slug: true, shortSummary: true, overview: true, publicationStatus: true } }, projects: { orderBy: { createdAt: "desc" } }, services: { orderBy: { name: "asc" } } },
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
    <div className="bg-[#F1F4F8]">
      <DashHero kind="Expert dashboard" name={expert.fullName} sub={expert.professionalTitle} photo={expert.photoUrl} Fallback={UserRound} viewHref={`/experts/${expert.contentItem.slug}`}
        signOut={<span className="w-32"><SignOutButton to="/expert" className="border border-white/25 bg-white/10 text-white hover:bg-white/20" /></span>}
        stats={[
          { label: "Jobs on your page", value: count("PUBLISHED"), Icon: CheckCircle2, tone: "bg-[#1F7A4D] text-white" },
          { label: "Waiting for our check", value: count("IN_REVIEW"), Icon: Clock, tone: "bg-accent text-ink" },
          { label: "Services you offer", value: expert.services.length, Icon: Briefcase, tone: "bg-white/15 text-white" },
        ]} />

      <div className="container-site flex flex-col gap-5 py-5 sm:gap-6 sm:py-8">
        <DashNotice ok={searchParams.saved ? NOTICE[searchParams.saved] : undefined} bad={searchParams.error ? ERROR[searchParams.error] : undefined} />
        {expert.contentItem.publicationStatus !== "PUBLISHED" ? <p role="status" className="rounded-2xl bg-accent-tint px-5 py-4 text-[15px] font-semibold text-accent-dark">Your page is not on the website yet: our team is checking your details. You can add your services and jobs now, and use &quot;See my page&quot; to see how it will look.</p> : null}
        <DashSteps steps={[["Say what you offer", "List your services and what each costs."], ["Show a job you did", "A photo and a few words. We check it first."], ["Clients find you", "They read your page and call or WhatsApp you."]]} />

        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:items-start lg:gap-6">
          {/* ── The main jobs: services and work done ── */}
          <div className="flex min-w-0 flex-col gap-5 lg:gap-6">
            <DashCard Icon={Briefcase} strong title={`My services (${expert.services.length})`} note="What you do for clients. These show on your page straight away.">
              {expert.services.length ? (
                <ul className="flex flex-col gap-2">
                  {expert.services.map((s) => (
                    <li key={s.id} className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3 text-[14px]">
                      <span className="flex min-w-0 flex-1 flex-col"><span className="font-display font-bold text-heading">{s.name}</span><span className="text-[13px] text-ink-soft">{[s.price, s.remark].filter(Boolean).join(" · ") || "No price given"}</span></span>
                      <form action={deleteService}><input type="hidden" name="id" value={s.id} /><button aria-label={`Remove ${s.name}`} className="flex h-10 w-10 items-center justify-center rounded-full text-ink-muted hover:bg-bad-bg hover:text-bad-fg"><Trash2 aria-hidden className="h-4 w-4" /></button></form>
                    </li>
                  ))}
                </ul>
              ) : <p className="rounded-2xl bg-page p-5 text-center text-[14px] text-ink-muted">No services yet. Add the first one below.</p>}
              <form key={expert.services.length} action={addService} className="grid gap-3 rounded-2xl bg-page p-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <label className={label}>What is the service?<input name="name" required minLength={2} maxLength={160} placeholder="e.g. Filing tax returns" className={`${input} min-h-[48px]`} /></label>
                <label className={label}>Price (optional)<input name="price" maxLength={80} placeholder="e.g. UGX 200,000" className={`${input} min-h-[48px]`} /></label>
                <label className={`${label} sm:col-span-2`}>A short note (optional)<input name="remark" maxLength={200} placeholder="e.g. Per month, for small businesses" className={input} /></label>
                <button className="btn-primary min-h-[48px] px-6 text-[15px] sm:col-span-2 sm:w-fit"><Plus aria-hidden className="h-4 w-4" />Add this service</button>
              </form>
            </DashCard>

            <DashCard id="add-job" Icon={Plus} strong title="Add a job you have done" note="Proof for new clients. Only the name is needed.">
              <WorkForm input={input} label={label} />
            </DashCard>

            <DashCard Icon={FileText} title={`Jobs done (${expert.projects.length})`} note={expert.projects.length ? "Tap Change to edit one. A changed job is checked again." : undefined}>
              {expert.projects.length === 0 ? <p className="rounded-2xl bg-page p-6 text-center text-[14px] text-ink-muted">No jobs yet. Add your first one above.</p> : (
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {expert.projects.map((w) => {
                    const st = statusOf(w.status);
                    return (
                      <li key={w.id} className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white">
                        <div className="relative flex aspect-[16/10] items-center justify-center bg-page">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {w.imageUrl ? <img src={w.imageUrl} alt="" className="h-full w-full object-cover" /> : <Briefcase aria-hidden className="h-8 w-8 text-brand/40" />}
                          <span className={`absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${st.cls}`}><st.Icon aria-hidden className="h-3 w-3" />{st.label}</span>
                        </div>
                        <div className="flex flex-1 flex-col gap-2 p-4">
                          <span className="line-clamp-2 font-display text-[15px] font-bold text-heading">{w.title}</span>
                          {w.clientName || w.year ? <span className="text-[12px] text-ink-muted">{[w.clientName, w.year].filter(Boolean).join(" · ")}</span> : null}
                          <span className="flex flex-wrap gap-3 text-[12px] font-semibold">
                            {w.fileUrl ? <a href={w.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1"><FileText aria-hidden className="h-3.5 w-3.5" />File</a> : null}
                            {w.linkUrl ? <a href={w.linkUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1"><Link2 aria-hidden className="h-3.5 w-3.5" />Link</a> : null}
                          </span>
                          <details className="mt-auto [&>summary::-webkit-details-marker]:hidden">
                            <summary className="inline-flex h-10 cursor-pointer list-none items-center rounded-full border border-line px-4 text-[13px] font-semibold text-heading hover:border-brand hover:text-brand">Change</summary>
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
              )}
            </DashCard>
          </div>

          {/* ── About me: rarely changed, so it sits to the side ── */}
          <div className="flex min-w-0 flex-col gap-5 lg:gap-6">
            <DashCard Icon={UserRound} title="My details" note="Shown at the top of your page. Phone and email are for members only.">
              <form action={saveExpertProfile} className="grid gap-3">
                <div className="flex flex-col gap-2">
                  <span className={label}>My photo or logo</span>
                  <UploadButton target="photoUrl" kind="image" />
                  <input name="photoUrl" defaultValue={expert.photoUrl ?? ""} placeholder="Filled in after you upload" aria-label="Photo address" className={`${input} text-[13px] text-ink-muted`} />
                </div>
                <label className={label}>What you do (your title)<input name="professionalTitle" defaultValue={expert.professionalTitle ?? ""} placeholder="e.g. Tax consultant" className={input} /></label>
                <label className={label}>What you are good at<input name="specialties" defaultValue={expert.specialties.join(", ")} placeholder="e.g. tax, accounting, export" className={input} /><span className="text-xs font-normal text-ink-muted">Put a comma between each one.</span></label>
                <label className={label}>Business or firm name<input name="businessName" defaultValue={expert.businessName ?? ""} className={input} /></label>
                <label className={label}>Phone clients call<input name="phone" type="tel" defaultValue={expert.phone ?? ""} placeholder="0772 123 456" className={input} /></label>
                <label className={label}>Email (if you have one)<input name="email" type="email" defaultValue={expert.email ?? ""} className={input} /></label>
                <label className={label}>Where are you? (address)<input name="address" defaultValue={expert.address ?? ""} placeholder="e.g. Plot 12, Kampala Road, 2nd floor" className={input} /></label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={label}>District<input name="district" defaultValue={expert.district ?? ""} placeholder="e.g. Wakiso" className={input} /></label>
                  <label className={label}>Country<input name="country" defaultValue={expert.country ?? ""} className={input} /></label>
                </div>
                <label className={label}>Website (if you have one)<input name="website" type="url" defaultValue={expert.website ?? ""} placeholder="https://" className={input} /></label>
                <details className="rounded-xl bg-page p-3 [&>summary::-webkit-details-marker]:hidden" open={Boolean(expert.profileUrl)}>
                  <summary className="cursor-pointer list-none text-[14px] font-semibold text-brand">+ Add my CV or company profile (optional)</summary>
                  <div className="mt-3 flex flex-col gap-2">
                    <UploadButton target="profileUrl" kind="file" />
                    <input name="profileUrl" defaultValue={expert.profileUrl ?? ""} placeholder="Filled in after you upload" aria-label="Profile file address" className={`${input} text-[13px] text-ink-muted`} />
                    <span className="text-xs text-ink-muted">Members can read and download it.</span>
                  </div>
                </details>
                <button className="btn-primary min-h-[48px] w-full px-5 text-[15px]">Save my details</button>
              </form>
            </DashCard>

            <details className="rounded-3xl border border-line bg-white p-5 [&>summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center gap-3 font-display text-[16px] font-bold text-heading"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-page text-ink-soft"><KeyRound aria-hidden className="h-5 w-5" /></span>Change my PIN</summary>
              <form action={changeMyPin} className="mt-4 flex flex-col gap-3">
                <input type="hidden" name="back" value="/expert" />
                <label className={label}>New 4-digit PIN<input name="password" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required autoComplete="new-password" className={`${input} tracking-[0.5em]`} /></label>
                <label className={label}>Type it again<input name="confirm" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required autoComplete="new-password" className={`${input} tracking-[0.5em]`} /></label>
                <button className="btn-outline min-h-[46px] w-full px-4 text-sm">Change PIN</button>
              </form>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkForm({ work, input, label }: {
  work?: { id: string; title: string; clientName: string | null; year: number | null; summary: string | null; outcome: string | null; imageUrl: string | null; fileUrl: string | null; linkUrl: string | null };
  input: string;
  label: string;
}) {
  const step = "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand font-display text-[13px] font-bold text-white";
  const question = "flex items-center gap-2 font-display text-[15px] font-bold text-heading";
  const big = `${input} min-h-[52px] text-[16px]`;
  const more = Boolean(work && (work.clientName || work.year || work.outcome || work.fileUrl || work.linkUrl));
  return (
    <form action={saveWork} className="mt-3 flex flex-col gap-5">
      {work ? <input type="hidden" name="id" value={work.id} /> : null}
      <label className="flex flex-col gap-2">
        <span className={question}><span className={step}>1</span>What was the job?</span>
        <input name="title" required defaultValue={work?.title} placeholder="e.g. Business plan for a poultry farm" className={big} />
      </label>
      <div className="flex flex-col gap-2">
        <span className={question}><span className={step}>2</span>Add a photo <span className="font-sans text-[13px] font-normal text-ink-muted">(optional)</span></span>
        <UploadButton target="imageUrl" kind="image" />
        <input name="imageUrl" defaultValue={work?.imageUrl ?? ""} placeholder="Filled in after you upload" aria-label="Photo address" className={`${input} text-[13px] text-ink-muted`} />
      </div>
      <label className="flex flex-col gap-2">
        <span className={question}><span className={step}>3</span>What did you do? <span className="font-sans text-[13px] font-normal text-ink-muted">(a few words)</span></span>
        <textarea name="summary" rows={3} defaultValue={work?.summary ?? ""} placeholder="e.g. Wrote the plan and the budget, and helped them apply for a loan" className="input w-full py-3 text-[15px]" />
      </label>
      <details open={more} className="rounded-xl bg-page p-3 [&>summary::-webkit-details-marker]:hidden">
        <summary className="cursor-pointer list-none text-[14px] font-semibold text-brand">+ More details (optional): client, year, result, a file or a link</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className={label}>Who was it for?<input name="clientName" defaultValue={work?.clientName ?? ""} className={input} /></label>
          <label className={label}>Which year?<input name="year" inputMode="numeric" maxLength={4} defaultValue={work?.year ?? ""} placeholder="e.g. 2026" className={input} /></label>
          <label className={`${label} sm:col-span-2`}>What was the result?<input name="outcome" defaultValue={work?.outcome ?? ""} placeholder="e.g. Loan of UGX 40m approved" className={input} /></label>
          <div className={`${label} sm:col-span-2`}>A file (PDF or document)
            <UploadButton target="fileUrl" kind="file" />
            <input name="fileUrl" defaultValue={work?.fileUrl ?? ""} placeholder="Filled in after you upload" aria-label="File address" className={`${input} text-[13px] font-normal text-ink-muted`} />
          </div>
          <label className={`${label} sm:col-span-2`}>A link (website, article or video)<input name="linkUrl" type="url" defaultValue={work?.linkUrl ?? ""} placeholder="https://" className={input} /></label>
        </div>
      </details>
      <div className="flex flex-col gap-1.5">
        <button className="btn-primary min-h-[52px] w-full px-6 text-[16px] sm:w-fit">{work ? "Save changes" : "Add this job"}</button>
        <span className="text-[12px] text-ink-muted">Our team checks it, then it shows on your page.</span>
      </div>
    </form>
  );
}

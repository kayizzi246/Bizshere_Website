import Link from "next/link";
import { BadgeCheck, Check, ImageIcon, LockKeyhole } from "lucide-react";
import type { Viewer } from "@/lib/access";
import { googleEnabled } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { date, money } from "@/lib/format";
import { DIRECTORIES } from "@/config/directories";
import { Connected, Crumbs, Evidence } from "./DetailParts";
import { Icon } from "./Icon";
import { OnboardingGate } from "./Onboarding";

/**
 * One layout for every directory detail page, built around the client's field
 * list (see `MAIN` in src/lib/content-fields.ts).
 *
 * Gating happens before this component: a page passes `locked: true` and NO value
 * for anything a visitor may not see. Nothing member-only reaches the browser; the
 * blurred dots shown in its place are filler. Every "Unlock" opens the onboarding
 * pop-up (sign in → pay) right here, then comes back to this page.
 */
export type DetailRow = { label: string; value?: React.ReactNode; locked?: boolean };
export type TextBlock = { label: string; text?: string | null; locked?: boolean };
export type LinkItem = { label: string; href?: string | null; locked?: boolean; icon?: string };
export type ContactInfo = { email?: string | null; phone?: string | null; website?: string | null };

const empty = (v: React.ReactNode) => v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);

export async function RecordPage({
  trail, eyebrow, title, brief, picture, pictureCredit, rows, texts = [], links = [], contact, children, viewer, item, back,
}: {
  trail: [string, string];
  eyebrow: string;
  title: string;
  brief?: string | null;
  /** Main photo URL, if the record has one. Placeholders are shown otherwise. */
  picture?: string | null;
  /** Photographer and licence, shown under the photo. */
  pictureCredit?: string | null;
  rows: DetailRow[];
  texts?: TextBlock[];
  links?: LinkItem[];
  /** `"locked"` for visitors: email and phone are not sent at all. */
  contact?: ContactInfo | "locked";
  children?: React.ReactNode;
  viewer: Viewer;
  item: { id: string; lastReviewedAt: Date | null; nextReviewDueAt: Date | null };
  back: string;
  /** Kept for older callers; the onboarding pop-up replaced the subscribe modal here. */
  gateTitle?: string;
}) {
  const plan = await prisma.membershipPlan.findUnique({ where: { code: "member" } });
  const planInfo = {
    name: plan?.name ?? "Member",
    monthly: plan?.priceMonthly != null ? money(plan.priceMonthly, plan.currency) : null,
    yearly: plan?.priceYearly != null ? money(plan.priceYearly, plan.currency) : null,
  };

  const icon = DIRECTORIES.find((d) => d.href === trail[0])?.icon ?? (trail[0] === "/recipes" ? "recipe" : "link");
  const ref = `BSU-${item.id.slice(-6).toUpperCase()}`;
  const lockedLabels = [
    ...rows.filter((r) => r.locked).map((r) => r.label),
    ...texts.filter((t) => t.locked).map((t) => t.label),
    ...links.filter((l) => l.locked).map((l) => l.label),
    ...(contact === "locked" ? ["Email", "Phone"] : []),
  ];
  const locked = lockedLabels.length > 0;
  const glance = rows.slice(0, 4);
  const more = rows.slice(4);
  const shownLinks = links.filter((l) => l.locked || l.href);
  const unlock = (label = "Unlock", cls = "") => (
    <Link href={back} data-onboard="" className={`inline-flex items-center gap-1.5 font-semibold text-brand hover:text-brand-dark ${cls}`}>
      <LockKeyhole aria-hidden className="h-3.5 w-3.5" />{label}
    </Link>
  );

  return (
    <OnboardingGate signedIn={Boolean(viewer.userId)} isMember={viewer.isMember} googleEnabled={googleEnabled} plan={planInfo}>
      <div className="container-site flex flex-col gap-6 py-6">
        <Crumbs trail={[trail]} title={title} />

        {/* ── Access status ── */}
        {viewer.isMember ? (
          <div className="flex items-center gap-3 rounded-2xl border border-brand/30 bg-brand-tint px-5 py-3 text-sm">
            <BadgeCheck aria-hidden className="h-5 w-5 shrink-0 text-brand" />
            <span><strong className="font-semibold">Full access.</strong> <span className="text-ink-soft">Every detail on this page is open to you.</span></span>
          </div>
        ) : locked ? (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-ink px-5 py-3.5 text-sm text-white">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand"><LockKeyhole aria-hidden className="h-4 w-4" /></span>
            <span className="flex-1"><strong className="font-semibold">Free preview.</strong> <span className="text-white/70">{lockedLabels.length} {lockedLabels.length === 1 ? "detail on this page is" : "details on this page are"} for members: {lockedLabels.join(", ").toLowerCase()}.</span></span>
            <Link href={back} data-onboard="" className="inline-flex h-10 items-center gap-2 rounded-full bg-brand px-5 font-semibold text-white hover:bg-brand-dark hover:text-white">Unlock full access <Icon name="arrow" className="h-4 w-4" /></Link>
          </div>
        ) : null}

        {/* ── Gallery and summary ── */}
        <header className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-start">
          <div className="flex flex-col gap-2">
            {picture ? (
              // External image URLs entered by editors; no Next image domain list to maintain.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={picture} alt={title} className="aspect-[16/10] w-full rounded-2xl border border-line bg-white object-cover" />
            ) : (
              <Placeholder icon={icon} label="Photo coming soon" className="aspect-[16/10] rounded-2xl" big />
            )}
            {picture && pictureCredit ? <p className="text-xs text-ink-muted">{pictureCredit}</p> : null}
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className={`relative overflow-hidden rounded-xl ${n === 1 ? "ring-2 ring-brand" : ""}`}>
                  {n === 1 && picture ? (
                    // eslint-disable-next-line @next/next/no-img-element -- same photo as above
                    <img src={picture} alt="" className="block aspect-[4/3] w-full rounded-xl object-cover" />
                  ) : (
                    <Placeholder icon={icon} className="aspect-[4/3] rounded-xl" />
                  )}
                  {n > 1 && locked && !viewer.isMember ? (
                    <span className="absolute inset-0 flex items-center justify-center gap-1 bg-ink/55 text-[11px] font-semibold text-white"><LockKeyhole aria-hidden className="h-3 w-3" /> Members</span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <span className="eyebrow">{eyebrow}</span>
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{title}</h1>
            {brief ? <p className="text-[17px] leading-relaxed text-ink-soft">{brief}</p> : null}
            <ul className="flex flex-wrap gap-2 text-xs">
              <li className="rounded-full border border-line bg-white px-3 py-1 font-mono text-ink-soft">Ref {ref}</li>
              <li className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-3 py-1 text-ink-soft"><Check aria-hidden className="h-3.5 w-3.5 text-brand" />Reviewed {date(item.lastReviewedAt)}</li>
              <li className="rounded-full border border-line bg-white px-3 py-1 text-ink-soft">{trail[1]}</li>
            </ul>

            {/* At a glance */}
            <dl className="grid grid-cols-2 gap-2.5">
              {glance.map((r) => (
                <div key={r.label} className="flex min-w-0 flex-col gap-1 rounded-xl border border-line bg-white p-3.5">
                  <dt className="text-xs font-medium text-ink-muted">{r.label}</dt>
                  <dd className="line-clamp-3 text-[15px] font-semibold leading-snug">
                    {r.locked ? <Blurred /> : empty(r.value) ? <span className="font-normal text-ink-muted">Not added yet</span> : r.value}
                  </dd>
                  {r.locked ? unlock("Unlock", "mt-0.5 text-xs") : null}
                </div>
              ))}
            </dl>

            {!viewer.isMember && locked ? (
              <div className="flex flex-col gap-2 rounded-2xl border-2 border-brand bg-brand-tint p-4">
                <Link href={back} data-onboard="" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand px-6 font-display text-base font-bold text-white hover:bg-brand-dark hover:text-white">
                  <LockKeyhole aria-hidden className="h-4 w-4" /> Unlock everything on this page
                </Link>
                <p className="text-center text-xs text-ink-soft">{planInfo.monthly ? `${planInfo.monthly} a month · ` : ""}Pay with MTN MoMo, Airtel Money or card · Cancel any time</p>
              </div>
            ) : null}
          </div>
        </header>

        {/* ── Details, long text and the access card ── */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="flex min-w-0 flex-col gap-5">
            {more.length ? (
              <section data-reveal className="card flex flex-col gap-4 p-6">
                <h2 className="text-lg font-extrabold">More details</h2>
                <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                  {more.map((r) => (
                    <div key={r.label} className="flex min-w-0 flex-col gap-1 border-b border-line pb-3">
                      <dt className="text-xs font-medium text-ink-muted">{r.label}</dt>
                      <dd className="text-[15px] font-semibold">
                        {r.locked ? <span className="flex items-center justify-between gap-3"><Blurred />{unlock()}</span> : empty(r.value) ? <span className="font-normal text-ink-muted">Not added yet</span> : r.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}

            {texts.map((t) => (
              <section key={t.label} data-reveal className="card flex flex-col gap-3 p-6">
                <h2 className="text-lg font-extrabold">{t.label}</h2>
                {t.locked ? (
                  <div className="relative">
                    <div aria-hidden className="flex select-none flex-col gap-2 blur-[3px]"><div className="h-3 w-full rounded bg-line" /><div className="h-3 w-11/12 rounded bg-line" /><div className="h-3 w-4/6 rounded bg-line" /></div>
                    <div className="absolute inset-0 flex items-center justify-center">{unlock(`Unlock the ${t.label.toLowerCase()}`, "rounded-full border border-brand bg-white px-4 py-2 text-sm")}</div>
                  </div>
                ) : t.text ? (
                  <p className="whitespace-pre-line leading-relaxed text-ink-soft">{t.text}</p>
                ) : (
                  <p className="text-sm text-ink-muted">Not added yet.</p>
                )}
              </section>
            ))}

            {children}

            <Evidence contentItemId={item.id} lastReviewedAt={item.lastReviewedAt} nextReviewDueAt={item.nextReviewDueAt} viewer={viewer} back={back} />
          </div>

          <aside className="flex flex-col gap-5 lg:sticky lg:top-24">
            {!viewer.isMember ? (
              <section className="flex flex-col gap-4 rounded-2xl bg-ink p-6 text-white">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-brand-mint">Membership</span>
                  <span className="font-display text-xl font-extrabold">{planInfo.monthly ? <>{planInfo.monthly}<span className="text-sm font-medium text-white/60"> / month</span></> : "Get full access"}</span>
                </div>
                <ul className="flex flex-col gap-2 text-sm text-white/85">
                  {(locked ? lockedLabels.map((l) => `${l} on this page`) : []).concat(["Every contact, price and budget", "Downloads and price history"]).map((t) => (
                    <li key={t} className="flex gap-2"><Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-brand-mint" />{t}</li>
                  ))}
                </ul>
                <Link href={back} data-onboard="" className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand font-semibold text-white hover:bg-brand-dark hover:text-white">Unlock full access <Icon name="arrow" className="h-4 w-4" /></Link>
                <p className="text-center text-xs text-white/60">MTN MoMo · Airtel Money · Card</p>
              </section>
            ) : null}

            {contact !== undefined ? (
              <section data-reveal className="card flex flex-col gap-3 p-6">
                <h2 className="text-lg font-extrabold">Contact</h2>
                <div className="flex flex-col gap-2.5 text-[15px]">
                  {contact === "locked" ? (
                    <>
                      <ContactLine label="Email" value={<Blurred />} />
                      <ContactLine label="Phone" value={<Blurred />} />
                      {unlock("Unlock contact details", "self-start text-sm")}
                    </>
                  ) : (
                    <>
                      <ContactLine label="Email" value={contact.email ? <a href={`mailto:${contact.email}`}>{contact.email}</a> : null} />
                      <ContactLine label="Phone" value={contact.phone ? <a href={`tel:${contact.phone.replace(/\s/g, "")}`}>{contact.phone}</a> : null} />
                    </>
                  )}
                </div>
              </section>
            ) : null}

            {shownLinks.length ? (
              <section data-reveal className="card flex flex-col gap-2.5 p-6">
                <h2 className="text-lg font-extrabold">Links</h2>
                {shownLinks.map((l) =>
                  l.locked ? (
                    <Link key={l.label} href={back} data-onboard="" className="btn-outline justify-between">
                      <span className="inline-flex items-center gap-2"><LockKeyhole aria-hidden className="h-4 w-4" />{l.label}</span>
                      <span className="text-xs font-semibold text-brand">Members</span>
                    </Link>
                  ) : (
                    <a key={l.label} href={l.href!} target="_blank" rel="noopener noreferrer" className="btn-outline justify-between">
                      <span className="inline-flex items-center gap-2"><Icon name={l.icon ?? "link"} className="h-4 w-4" />{l.label}</span>
                      <Icon name="arrow" className="h-4 w-4" />
                    </a>
                  ),
                )}
              </section>
            ) : null}

            <Connected contentItemId={item.id} />
          </aside>
        </div>
      </div>
    </OnboardingGate>
  );
}

/** Image placeholder with the directory's icon on a light hatched background. */
function Placeholder({ icon, label, className = "", big = false }: { icon: string; label?: string; className?: string; big?: boolean }) {
  return (
    <div className={`relative flex w-full flex-col items-center justify-center gap-2 overflow-hidden border border-line bg-page text-ink-muted [background-image:repeating-linear-gradient(135deg,transparent_0_10px,rgba(10,10,10,0.03)_10px_20px)] ${className}`}>
      <span className={`flex items-center justify-center rounded-full border border-line bg-white text-brand ${big ? "h-16 w-16" : "h-8 w-8"}`}>
        <Icon name={icon} className={big ? "h-7 w-7" : "h-4 w-4"} strokeWidth={1.75} />
      </span>
      {label ? <span className="inline-flex items-center gap-1.5 text-sm"><ImageIcon aria-hidden className="h-4 w-4" />{label}</span> : null}
    </div>
  );
}

/** Filler shown in place of a locked value. Contains no real data. */
function Blurred() {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className="select-none font-mono tracking-widest text-ink-muted blur-[3px]">••••••••</span>
      <span className="sr-only">Locked for members</span>
    </span>
  );
}

function ContactLine({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-0.5">
      <span className="text-ink-muted">{label}</span>
      {value ? <span className="font-semibold">{value}</span> : <span className="text-ink-muted">Not added yet</span>}
    </div>
  );
}

/** Small helpers pages use to format field values. */
export const list = (xs?: string[] | null) => (xs && xs.length ? xs.join(", ") : null);
export const titleCase = (s?: string | null) => (s ? s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ") : null);
/** An outside link shown as its address, or null (so the row reads "Not added yet"). */
export const extLink = (href?: string | null) =>
  href ? <a href={href} target="_blank" rel="noopener noreferrer" className="break-all">{href.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a> : null;

import { LockKeyhole } from "lucide-react";
import type { Viewer } from "@/lib/access";
import { Gate } from "./Gate";
import { Connected, Crumbs, Evidence } from "./DetailParts";
import { Icon } from "./Icon";

/**
 * One layout for every directory detail page, built around the client's field
 * list (see `MAIN` in src/lib/content-fields.ts).
 *
 * Gating happens before this component: a page passes `locked: true` and NO value
 * for anything a visitor may not see. Nothing member-only reaches the browser.
 */
export type DetailRow = { label: string; value?: React.ReactNode; locked?: boolean };
export type TextBlock = { label: string; text?: string | null; locked?: boolean };
export type LinkItem = { label: string; href?: string | null; locked?: boolean; icon?: string };
export type ContactInfo = { email?: string | null; phone?: string | null; website?: string | null };

const empty = (v: React.ReactNode) => v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);

export function RecordPage({
  trail, eyebrow, title, brief, picture, rows, texts = [], links = [], contact, children, viewer, item, back, gateTitle = "Subscribe to see everything",
}: {
  trail: [string, string];
  eyebrow: string;
  title: string;
  brief?: string | null;
  /** Pass `undefined` to show no picture slot; `null` to show an empty one. */
  picture?: string | null;
  rows: DetailRow[];
  texts?: TextBlock[];
  links?: LinkItem[];
  /** `"locked"` for visitors: email and phone are not sent at all. */
  contact?: ContactInfo | "locked";
  children?: React.ReactNode;
  viewer: Viewer;
  item: { id: string; lastReviewedAt: Date | null; nextReviewDueAt: Date | null };
  back: string;
  gateTitle?: string;
}) {
  const lockedRows = rows.filter((r) => r.locked);
  const shownLinks = links.filter((l) => l.locked || l.href);
  return (
    <div className="container-site flex flex-col gap-6 py-6">
      <Crumbs trail={[trail]} title={title} />

      <header className={`grid gap-6 ${picture !== undefined ? "lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start" : ""}`}>
        <div className="flex flex-col gap-3">
          <span className="eyebrow">{eyebrow}</span>
          <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
          {brief ? <p className="max-w-3xl text-lg leading-relaxed text-ink-soft">{brief}</p> : null}
        </div>
        {picture !== undefined ? (
          picture ? (
            // External image URLs entered by editors; no Next image domain list to maintain.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={picture} alt={title} className="aspect-[4/3] w-full rounded-2xl border border-line bg-white object-cover" />
          ) : (
            <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong bg-white text-sm text-ink-muted">
              <Icon name="machine" className="h-8 w-8" strokeWidth={1.5} />
              Picture coming soon
            </div>
          )
        ) : null}
      </header>

      <div className="flex flex-wrap items-start gap-7">
        <div className="flex min-w-0 flex-[999_1_640px] flex-col gap-5">
          <section data-reveal className="card flex flex-col p-7">
            <h2 className="mb-2 text-lg font-extrabold">Key details</h2>
            <dl>
              {rows.map((r) => (
                <div key={r.label} className="grid gap-1 border-b border-line py-3 text-[15px] last:border-0 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-6">
                  <dt className="text-ink-muted">{r.label}</dt>
                  <dd className="font-semibold">
                    {r.locked ? (
                      <span className="inline-flex items-center gap-1.5 font-normal text-ink-muted"><Lock /> Members only</span>
                    ) : empty(r.value) ? (
                      <span className="font-normal text-ink-muted">Not added yet</span>
                    ) : r.value}
                  </dd>
                </div>
              ))}
            </dl>
            {lockedRows.length ? (
              <div className="pt-3">
                <Gate compact button={`Show ${lockedRows.map((r) => r.label.toLowerCase()).join(" and ")}`} modalTitle={gateTitle} />
              </div>
            ) : null}
          </section>

          {texts.map((t) => (
            <section key={t.label} className="card flex flex-col gap-3 p-7">
              <h2 className="text-lg font-extrabold">{t.label}</h2>
              {t.locked ? (
                <Gate title={`Read the ${t.label.toLowerCase()}`} text="Available to members." modalTitle={gateTitle} teaser={<div className="flex flex-col gap-2"><div className="h-3 w-full rounded bg-line" /><div className="h-3 w-5/6 rounded bg-line" /><div className="h-3 w-2/3 rounded bg-line" /></div>} />
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

        <aside className="flex flex-[1_1_320px] flex-col gap-5">
          {contact !== undefined ? (
            <section data-reveal className="card flex flex-col gap-3 p-6">
              <h2 className="text-lg font-extrabold">Contact</h2>
              {contact === "locked" ? (
                <Gate compact button="Show email and phone" modalTitle={gateTitle} />
              ) : (
                <div className="flex flex-col gap-2 text-[15px]">
                  <ContactLine label="Email" value={contact.email} href={contact.email ? `mailto:${contact.email}` : undefined} />
                  <ContactLine label="Phone" value={contact.phone} href={contact.phone ? `tel:${contact.phone.replace(/\s/g, "")}` : undefined} />
                </div>
              )}
            </section>
          ) : null}

          {shownLinks.length ? (
            <section data-reveal className="card flex flex-col gap-2.5 p-6">
              <h2 className="text-lg font-extrabold">Links</h2>
              {shownLinks.map((l) =>
                l.locked ? (
                  <Gate key={l.label} compact button={l.label} modalTitle={gateTitle} />
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
  );
}

function ContactLine({ label, value, href }: { label: string; value?: string | null; href?: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-0.5">
      <span className="text-ink-muted">{label}</span>
      {value && href ? <a href={href} className="font-semibold">{value}</a> : <span className="text-ink-muted">Not added yet</span>}
    </div>
  );
}

function Lock() {
  return <LockKeyhole aria-hidden className="h-4 w-4" />;
}

/** Small helpers pages use to format field values. */
export const list = (xs?: string[] | null) => (xs && xs.length ? xs.join(", ") : null);
export const titleCase = (s?: string | null) => (s ? s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ") : null);
/** An outside link shown as its address, or null (so the row reads "Not added yet"). */
export const extLink = (href?: string | null) =>
  href ? <a href={href} target="_blank" rel="noopener noreferrer" className="break-all">{href.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a> : null;

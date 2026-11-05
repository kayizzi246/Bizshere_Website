import Link from "next/link";
import { ArrowLeft, type LucideIcon } from "lucide-react";

/**
 * The top of a supplier's or expert's page, so the two always match: a navy band with the photo or
 * logo, the name and the actions, running up behind the header; then ProfileFacts, the details as
 * a grid that overlaps the band. The fields themselves are the client's templates.
 */
export function ProfileTop({ back, backLabel, image, name, sub, children }: { back: string; backLabel: string; image: string | null; name: string; sub?: string | null; children: React.ReactNode }) {
  return (
    <header className="under-header hero-glow hero-still bg-navy text-white">
      <div className="container-site flex flex-col gap-5 pb-16 pt-5 sm:pb-20 sm:pt-7">
        <Link href={back} className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-white/75 hover:text-white"><ArrowLeft aria-hidden className="h-4 w-4" />{backLabel}</Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            {image ? (
              // Uploaded or editor-entered address; no Next image domain list to maintain.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" className="h-20 w-20 shrink-0 rounded-2xl bg-white object-cover ring-2 ring-white/20 sm:h-24 sm:w-24" />
            ) : <span aria-hidden className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white font-display text-[32px] font-extrabold text-brand sm:h-24 sm:w-24">{name.charAt(0)}</span>}
            <span className="flex min-w-0 flex-col gap-1">
              <h1 className="text-hero text-[26px] leading-[1.1] sm:text-[36px]">{name}</h1>
              {sub ? <span className="text-[15px] text-white/75">{sub}</span> : null}
            </span>
          </div>
          <div className="flex shrink-0 flex-col gap-2 text-ink sm:w-56 sm:items-end">{children}</div>
        </div>
      </div>
    </header>
  );
}

export type ProfileFact = { label: string; value: React.ReactNode; icon: LucideIcon };

export function ProfileFacts({ facts }: { facts: ProfileFact[] }) {
  return (
    <dl className="relative -mt-10 grid grid-cols-[minmax(0,1fr)] gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
      {facts.map(({ label, value, icon: Glyph }) => (
        <div key={label} className="flex min-w-0 items-center gap-3 bg-white p-4 sm:last:odd:col-span-2 lg:last:odd:col-span-1">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand"><Glyph aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.75} /></span>
          <span className="flex min-w-0 flex-col">
            <dt className="text-[12px] font-medium text-ink-muted">{label}</dt>
            <dd className="min-w-0 break-words text-[14px] font-semibold text-heading">{value}</dd>
          </span>
        </div>
      ))}
    </dl>
  );
}

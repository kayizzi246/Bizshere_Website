import { LockKeyhole } from "lucide-react";
import { BorderSnake } from "./BorderSnake";

export type CollagePhoto = {
  src: string; title: string; sub: string; href: string; kind: "idea" | "machine" | "product";
  /** Short price ("UGX 3.5M–4.6M"): an idea's starting capital, or for members a machine's or product's price */
  price?: string | null;
  /** There is a price, but it is member detail (never sent to visitors) */
  locked?: boolean;
};

// What each one is, as a small coloured label (text only; client, 25 Nov 2026)
const KIND: Record<CollagePhoto["kind"], { label: string; tone: string; dot: string }> = {
  idea: { label: "Business idea", tone: "text-[#9DBBFF]", dot: "bg-[#9DBBFF]" },
  machine: { label: "Machine", tone: "text-accent", dot: "bg-accent" },
  product: { label: "Supplier", tone: "text-[#5BE3A1]", dot: "bg-[#5BE3A1]" },
};

/**
 * The right side of the homepage hero. Smaller and redesigned (client, 26 Nov 2026: "don't make this big, make it
 * small and redesign it well"), and moving (same day: "make the carousel scroll"). A compact card: on top the four
 * newest listings take turns as the featured photo (sliding in sideways every 5 seconds with a slow zoom; .feature-slide in
 * globals.css), each with its kind and name; under it every other listing as square thumbnails in a strip that
 * scrolls slowly sideways and loops with no jump (the strip holds its tiles twice). Pictures only, nothing to click
 * (client, 12 Nov 2026). Still for reduced motion: the first photo, and the strip at rest.
 */
export function HeroCollage({ photos }: { photos: CollagePhoto[] }) {
  const slides = photos.slice(0, 4);
  const strip = photos.slice(1);
  return (
    <div aria-label="Latest on BizSphere-Ug" className="collage relative flex w-full flex-col gap-2.5 rounded-2xl bg-[#081A3C]/55 p-3 text-white">
      <BorderSnake />
      <div className="flex items-center justify-between gap-3 px-1 pt-0.5">
        <span className="flex items-center gap-2 text-[12px] font-medium text-white">
          <span aria-hidden className="relative flex h-2 w-2 shrink-0"><span className="absolute inset-0 rounded-full bg-accent opacity-60 motion-safe:animate-ping" /><span className="relative h-2 w-2 rounded-full bg-accent" /></span>
          Latest on BizSphere-Ug
        </span>
        <span className="text-[10px] text-white/50">Ideas · Machines · Suppliers</span>
      </div>

      {/* The featured listings, taking turns */}
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl bg-[#04112A]">
        {slides.map((p, i) => {
          const k = KIND[p.kind];
          return (
            <figure key={p.href} aria-hidden={i > 0 || undefined} className="feature-slide absolute inset-0" style={{ animationDelay: `${i * 5}s` }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- uploaded or editor-entered address */}
              <img src={p.src} alt="" loading={i ? "lazy" : undefined} className="feature-zoom absolute inset-0 h-full w-full bg-white object-cover" style={{ animationDelay: `${i * 5}s` }} />
              <span aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#04112A] via-[#04112A]/70 to-transparent" />
              <figcaption className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 px-3 pb-2.5">
                <span className={`text-[9.5px] font-semibold uppercase tracking-[0.12em] ${k.tone}`}>{k.label}</span>
                <span className="truncate text-[12.5px] font-medium leading-snug text-white">{p.title}</span>
                {p.price || p.locked ? (
                  <span className="mt-1 w-fit">{p.price ? (
                    <span className="inline-flex items-center rounded-md bg-accent px-2 py-0.5 text-[11.5px] font-bold text-ink">{p.kind === "idea" ? `Start with ${p.price}` : p.price}</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-0.5 text-[11px] font-semibold text-white"><LockKeyhole aria-hidden className="h-3 w-3 text-accent" />Price for members</span>
                  )}</span>
                ) : null}
              </figcaption>
            </figure>
          );
        })}
        {/* Which one is showing: four short bars that fill in turn */}
        <span aria-hidden className="absolute right-3 top-3 flex gap-1">
          {slides.map((p, i) => <span key={p.href} className="relative h-[3px] w-4 overflow-hidden rounded-full bg-white/30"><span className="feature-tick absolute inset-0 origin-left rounded-full bg-white" style={{ animationDelay: `${i * 5}s` }} /></span>)}
        </span>
      </div>

      {/* Everything else, scrolling sideways */}
      {strip.length ? (
        <div className="relative -mx-3 overflow-hidden px-3 [mask-image:linear-gradient(to_right,transparent,#000_6%,#000_94%,transparent)]">
          <ul className="thumb-strip flex w-max" style={{ animationDuration: `${strip.length * 4}s` }}>
            {[...strip, ...strip].map((p, i) => {
              const k = KIND[p.kind];
              return (
                <li key={`${p.href}-${i}`} aria-hidden={i >= strip.length || undefined} className="flex w-[124px] shrink-0 flex-col gap-1 pr-2 2xl:w-[140px]">
                  <span className="collage-thumb relative block aspect-square overflow-hidden rounded-lg bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element -- uploaded or editor-entered address */}
                    <img src={p.src} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                  </span>
                  <span className="flex min-w-0 items-center gap-1 px-0.5">
                    <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${k.dot}`} />
                    <span className="truncate text-[10px] leading-tight text-white/75">{p.title}</span>
                  </span>
                  {p.price ? (
                    <span className="truncate px-0.5 text-[10.5px] font-bold leading-tight text-accent">{p.price}</span>
                  ) : p.locked ? (
                    <span className="flex items-center gap-1 px-0.5 text-[10px] font-semibold leading-tight text-white/60"><LockKeyhole aria-hidden className="h-2.5 w-2.5 shrink-0 text-accent" />Members</span>
                  ) : null}
                  <span className="sr-only">{k.label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

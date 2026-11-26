import { BorderSnake } from "./BorderSnake";

export type CollagePhoto = { src: string; title: string; sub: string; href: string; kind: "idea" | "machine" | "product" };

// What each one is, as a small coloured label (text only; client, 25 Nov 2026)
const KIND: Record<CollagePhoto["kind"], { label: string; tone: string; dot: string }> = {
  idea: { label: "Business idea", tone: "text-[#9DBBFF]", dot: "bg-[#9DBBFF]" },
  machine: { label: "Machine", tone: "text-accent", dot: "bg-accent" },
  product: { label: "Supplier", tone: "text-[#5BE3A1]", dot: "bg-[#5BE3A1]" },
};

/**
 * The right side of the homepage hero. Smaller and redesigned (client, 26 Nov 2026: "don't make this big, make it
 * small and redesign it well"): a compact card that takes the height it needs instead of a fixed 470px. On top the
 * newest listing as a featured photo with its kind and name on one line; under it three more in one row of
 * square thumbnails, each with a small coloured dot and its kind, so nothing is squeezed into tiny lines of text
 *, the name under each one in a single line. Pictures only, nothing to click (client, 12 Nov 2026). The tiles come in
 * one after another, quickly; still for reduced motion (.hero-rise in globals.css).
 */
export function HeroCollage({ photos }: { photos: CollagePhoto[] }) {
  const [feature, ...rest] = photos;
  const f = KIND[feature.kind];
  const grid = rest.slice(0, 3);
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

      {/* The featured listing */}
      <figure className="relative aspect-[16/9] w-full shrink-0 overflow-hidden rounded-xl bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element -- uploaded or editor-entered address */}
        <img src={feature.src} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#04112A] via-[#04112A]/70 to-transparent" />
        <figcaption className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 px-3 pb-2.5">
          <span className={`text-[9.5px] font-semibold uppercase tracking-[0.12em] ${f.tone}`}>{f.label}</span>
          <span className="truncate text-[12.5px] font-medium leading-snug text-white">{feature.title}</span>
        </figcaption>
      </figure>

      {/* Three more, in one row */}
      {grid.length ? (
        <ul className="hero-rise grid grid-cols-3 gap-2">
          {grid.map((p) => {
            const k = KIND[p.kind];
            return (
              <li key={p.href} className="flex min-w-0 flex-col gap-1">
                <span className="collage-thumb relative block aspect-square overflow-hidden rounded-lg bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element -- uploaded or editor-entered address */}
                  <img src={p.src} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                </span>
                <span className="flex min-w-0 items-center gap-1 px-0.5">
                  <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${k.dot}`} />
                  <span className="truncate text-[10px] leading-tight text-white/75">{p.title}</span>
                </span>
                <span className="sr-only">{k.label}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

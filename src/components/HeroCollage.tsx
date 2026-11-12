export type CollagePhoto = { src: string; title: string; sub: string; href: string };

/**
 * The right side of the homepage hero (client, 12 Nov 2026, after a SaaS site they liked): two columns of
 * real photos from the site (business ideas, machines, suppliers' products), all the same height (client, 12 Nov
 * 2026, after the example they sent), drifting slowly, one up and
 * one down, each with its name and what it is. Each column holds its photos twice, so the loop has no
 * jump (.collage-col in globals.css). It ignores the mouse (no pause, nothing to click) and stands still for reduced motion.
 * The photos are pictures only, not links (client, 12 Nov 2026).
 */
export function HeroCollage({ photos }: { photos: CollagePhoto[] }) {
  const cols = [photos.filter((_, i) => i % 2 === 0), photos.filter((_, i) => i % 2 === 1)];
  return (
    <div aria-label="From BizSphere-Ug" className="collage relative grid h-[540px] grid-cols-2 gap-3 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,#000_10%,#000_90%,transparent)]">
      {cols.map((col, c) => (
        <div key={c} className={`collage-col flex flex-col gap-3 ${c ? "collage-down" : ""}`}>
          {[...col, ...col].map((p, i) => (
            <div key={`${p.href}-${i}`} aria-hidden={i >= col.length ? true : undefined}
              className={`relative block shrink-0 overflow-hidden rounded-md bg-white/[0.04] text-white h-[300px]`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- uploaded or editor-entered address */}
              <img src={p.src} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
              <span aria-hidden className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />
              <span className="absolute bottom-3 left-3 right-3 flex flex-col border-l-2 border-white pl-2.5 leading-tight">
                <span className="truncate font-display text-[14px] font-bold">{p.title}</span>
                <span className="truncate text-[12px] text-white/85">{p.sub}</span>
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

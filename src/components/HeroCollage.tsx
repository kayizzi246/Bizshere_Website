import { BorderSnake } from "./BorderSnake";

export type CollagePhoto = { src: string; title: string; sub: string; href: string; kind: "idea" | "machine" | "product" };

// What each one is, as a small coloured label in capitals (text only, no pill; client, 25 Nov 2026)
const KIND: Record<CollagePhoto["kind"], { label: string; tone: string }> = {
  idea: { label: "Business idea", tone: "text-[#9DBBFF]" },
  machine: { label: "Machine", tone: "text-accent" },
  product: { label: "Supplier", tone: "text-[#5BE3A1]" },
};
const tag = "text-[8.5px] font-medium uppercase tracking-[0.12em]";

/**
 * The right side of the homepage hero (redesigned 13 Nov 2026, replacing the two drifting photo columns):
 * one glass panel with the newest listing as a large featured photo, then the rest as a list that scrolls
 * slowly upwards (thumbnail, name, where it's from, a coloured tag for what it is). The list holds its rows
 * twice so the loop has no jump (.collage-col in globals.css). Pictures only, nothing to click (client,
 * 12 Nov 2026); stands still for reduced motion.
 */
export function HeroCollage({ photos }: { photos: CollagePhoto[] }) {
  const [feature, ...rest] = photos;
  const f = KIND[feature.kind];
  return (
    <div aria-label="Latest on BizSphere-Ug" className="collage relative flex h-[470px] flex-col gap-3 rounded-2xl bg-[#081A3C]/45 p-4 text-white">
      <BorderSnake />
      {/* No bold anywhere in the panel (client, 25 Nov 2026): a live dot and the title on one line, regular weight */}
      <div className="flex items-baseline justify-between gap-3 px-1">
        <span className="flex items-center gap-2 text-[11px] font-medium text-white">
          <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />Latest on BizSphere-Ug
        </span>
        <span className="text-[9px] text-white/50">Ideas · Machines · Suppliers</span>
      </div>

      {/* The featured listing: what it is, then its name in up to two lines */}
      <div className="relative h-[180px] shrink-0 overflow-hidden rounded-xl bg-white/[0.05]">
        {/* eslint-disable-next-line @next/next/no-img-element -- uploaded or editor-entered address */}
        <img src={feature.src} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#04112A]/95 to-transparent" />
        <span className="absolute bottom-3 left-3 right-3 flex flex-col items-start gap-1">
          <span className={`${tag} ${f.tone}`}>{f.label}</span>
          <span className="line-clamp-2 w-full text-[11.5px] font-normal leading-snug text-white">{feature.title}</span>
        </span>
      </div>

      {/* The rest, scrolling slowly upwards */}
      <div className="relative min-h-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,#000_12%,#000_88%,transparent)]">
        <ul className="collage-col collage-slow flex flex-col gap-3">
          {[...rest, ...rest].map((p, i) => {
            const k = KIND[p.kind];
            return (
              <li key={`${p.href}-${i}`} aria-hidden={i >= rest.length ? true : undefined}
                className="flex items-center gap-3 rounded-xl bg-white/[0.04] raised p-2">
                <span className="collage-thumb relative h-[52px] w-[68px] shrink-0 overflow-hidden rounded-lg bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element -- uploaded or editor-entered address */}
                  <img src={p.src} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                </span>
                {/* What it is above the name, so the name has the whole width and up to two lines */}
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className={`${tag} ${k.tone}`}>{k.label}</span>
                  <span className="line-clamp-2 text-[10px] font-normal leading-snug text-white">{p.title}</span>
                  <span className="truncate text-[9px] leading-tight text-white/50">{p.sub}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

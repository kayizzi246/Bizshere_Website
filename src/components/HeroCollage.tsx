export type CollagePhoto = { src: string; title: string; sub: string; href: string; kind: "idea" | "machine" | "product" };

const KIND: Record<CollagePhoto["kind"], { label: string; tone: string }> = {
  idea: { label: "Business idea", tone: "bg-[#2E6BFF]/20 text-[#9DBBFF]" },
  machine: { label: "Machine", tone: "bg-accent/20 text-accent" },
  product: { label: "Supplier", tone: "bg-[#12B76A]/20 text-[#5BE3A1]" },
};

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
    <div aria-label="Latest on BizSphere-Ug" className="collage flex h-[470px] flex-col gap-3 rounded-2xl border border-white/5 bg-transparent p-4 text-white">
      <div className="flex items-center justify-between gap-3 px-1">
        <span className="flex flex-col leading-tight">
          <span className="font-display text-[13px] font-extrabold tracking-[-0.01em]">Latest on BizSphere-Ug</span>
          <span className="text-[10.5px] text-white/55">Ideas · Machines · Suppliers</span>
        </span>
        <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-white/70">New</span>
      </div>

      {/* The featured listing */}
      <div className="relative h-[180px] shrink-0 overflow-hidden rounded-xl bg-white/[0.05]">
        {/* eslint-disable-next-line @next/next/no-img-element -- uploaded or editor-entered address */}
        <img src={feature.src} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#04112A]/90 to-transparent" />
        <span className="absolute bottom-3 left-3 right-3 flex flex-col items-start gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${f.tone} backdrop-blur-sm`}>{f.label}</span>
          <span className="w-full truncate font-display text-[15px] font-extrabold leading-tight tracking-[-0.01em]">{feature.title}</span>
        </span>
      </div>

      {/* The rest, scrolling slowly upwards */}
      <div className="relative min-h-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,#000_12%,#000_88%,transparent)]">
        <ul className="collage-col collage-slow flex flex-col gap-3">
          {[...rest, ...rest].map((p, i) => {
            const k = KIND[p.kind];
            return (
              <li key={`${p.href}-${i}`} aria-hidden={i >= rest.length ? true : undefined}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-2">
                <span className="collage-thumb relative h-[52px] w-[68px] shrink-0 overflow-hidden rounded-lg bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element -- uploaded or editor-entered address */}
                  <img src={p.src} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5 leading-tight">
                  <span className="truncate font-display text-[12px] font-bold">{p.title}</span>
                  <span className="truncate text-[10.5px] text-white/60">{p.sub}</span>
                </span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${k.tone}`}>{k.label}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

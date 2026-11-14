/**
 * Animated gradient mesh: soft brand blue #0969da glows (with a hint of brand orange)
 * drifting on deep navy #0d1117 (bg-navy), and a wash for text contrast. No particles or grid: a clean
 * background keeps the content first.
 * Pure CSS (keyframes in globals.css); stops with reduced motion. Place inside a
 * `relative isolate overflow-hidden` section.
 */
const BLOBS = [
  { className: "left-[-12%] top-[-14%] h-[46rem] w-[46rem] bg-brand/30", anim: "mesh-drift-1", dur: "22s", delay: "0s" },
  { className: "right-[-14%] top-[-8%] h-[40rem] w-[40rem] bg-brand/20", anim: "mesh-drift-2", dur: "26s", delay: "-6s" },
  { className: "left-[22%] bottom-[-24%] h-[44rem] w-[44rem] bg-brand/45", anim: "mesh-drift-3", dur: "30s", delay: "-3s" },
  { className: "right-[6%] bottom-[-18%] h-[34rem] w-[34rem] bg-brand-sky/10", anim: "mesh-drift-1", dur: "28s", delay: "-11s" },
  { className: "left-[40%] top-[8%] h-[30rem] w-[30rem] bg-accent/[0.06]", anim: "mesh-drift-2", dur: "24s", delay: "-14s" },
];

export function GradientMesh() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-navy">
      {BLOBS.map((b, i) => (
        <div
          key={i}
          className={`mesh-blob absolute rounded-full mix-blend-screen blur-3xl ${b.className}`}
          style={{ "--mesh-anim": b.anim, "--mesh-dur": b.dur, "--mesh-delay": b.delay } as React.CSSProperties}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-navy/70 via-navy/40 to-navy/80" />
    </div>
  );
}

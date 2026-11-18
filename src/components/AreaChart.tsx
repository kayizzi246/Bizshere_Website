/**
 * A small area chart, drawn as plain SVG.
 *
 * Shaped after the chart in shadcn's dashboard-01 block (client, 18 Nov 2026, who asked for that
 * dashboard's form): a soft gradient under a single smooth line, a flat baseline, quiet gridlines
 * and the value only where it matters — the end of the line and the axis ends. That block draws it
 * with Recharts, which brings React re-renders and about 400 KB of JavaScript for one picture; this
 * is a server component with no JavaScript at all, so the admin stays as quick as it is now.
 *
 * The curve is a Catmull-Rom spline turned into cubic béziers, which keeps the line passing exactly
 * through every reading — a plain smoothing would round the peaks away and show money that was
 * never taken.
 */
export type Point = { label: string; value: number };

export function AreaChart({ points, height = 180, format = (n: number) => String(n), accent = "var(--chart-accent, #157EC2)" }: {
  points: Point[];
  height?: number;
  /** How a value reads to a person: money, a count… */
  format?: (n: number) => string;
  accent?: string;
}) {
  if (points.length < 2) return null;
  const W = 720;
  const H = height;
  const padTop = 12;
  const padBottom = 22;
  const top = Math.max(...points.map((p) => p.value), 1);
  const x = (i: number) => (i / (points.length - 1)) * W;
  const y = (v: number) => padTop + (1 - v / top) * (H - padTop - padBottom);

  // Catmull-Rom → cubic bézier, so the line is smooth but still touches every reading.
  const curve = points
    .map((p, i) => {
      if (i === 0) return `M ${x(0).toFixed(1)} ${y(p.value).toFixed(1)}`;
      const p0 = points[i - 2] ?? points[i - 1];
      const p1 = points[i - 1];
      const p2 = p;
      const c1x = x(i - 1) + (x(i) - x(i - 2 < 0 ? 0 : i - 2)) / 6;
      const c1y = y(p1.value) + (y(p2.value) - y(p0.value)) / 6;
      const p3 = points[i + 1] ?? p2;
      const c2x = x(i) - (x(i + 1 >= points.length ? i : i + 1) - x(i - 1)) / 6;
      const c2y = y(p2.value) - (y(p3.value) - y(p1.value)) / 6;
      return `C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${x(i).toFixed(1)} ${y(p2.value).toFixed(1)}`;
    })
    .join(" ");
  const area = `${curve} L ${W} ${H - padBottom} L 0 ${H - padBottom} Z`;
  const id = `area-${points.length}-${Math.round(top)}`;
  const last = points[points.length - 1];

  return (
    <figure className="flex flex-col gap-1">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img"
        aria-label={`${points.length} days, highest ${format(top)}, latest ${format(last.value)}`}
        className="h-[180px] w-full">
        <defs>
          <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.28" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {/* Three quiet gridlines, and the baseline the area sits on */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2={W} y1={padTop + f * (H - padTop - padBottom)} y2={padTop + f * (H - padTop - padBottom)}
            stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" className="text-ink" />
        ))}
        <line x1="0" x2={W} y1={H - padBottom} y2={H - padBottom} stroke="currentColor" strokeOpacity="0.16" strokeWidth="1" className="text-ink" />
        <path d={area} fill={`url(#${id})`} />
        <path d={curve} fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {/* The latest reading, marked */}
        <circle cx={W} cy={y(last.value)} r="3.5" fill={accent} />
      </svg>
      <figcaption className="flex items-center justify-between text-[11px] text-ink-muted">
        <span>{points[0].label}</span>
        <span className="font-semibold text-ink">Highest {format(top)}</span>
        <span>{last.label}</span>
      </figcaption>
    </figure>
  );
}

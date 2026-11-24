// [tail length, as a percentage of the way round; thickness; strength]: overlaid so the tail tapers and fades.
const TAIL: [number, number, number][] = [[16, 1.5, 0.22], [11, 2, 0.35], [6.5, 2.5, 0.6], [3, 3, 0.9], [0.01, 7, 1]];

/**
 * An orange dot running round a panel's border with a tail behind it, like a snake (client, 24 Nov 2026). Put it
 * inside any `relative` panel without overflow-hidden; `radius` is the panel's corner. The rectangle counts as 100
 * units round whatever its size (pathLength), so every line keeps pace. Hidden for reduced motion (globals.css).
 */
export function BorderSnake({ radius = 8 }: { radius?: number }) {
  return (
    <svg aria-hidden className="border-snake pointer-events-none absolute inset-0 h-full w-full overflow-visible" fill="none" stroke="#F28C28" strokeLinecap="round">
      {TAIL.map(([length, width, opacity]) => (
        <rect key={length} x="0" y="0" width="100%" height="100%" rx={radius} pathLength={100} strokeWidth={width} strokeOpacity={opacity}
          strokeDasharray={`${length} ${100 - length}`} style={{ "--tail": length } as React.CSSProperties} />
      ))}
    </svg>
  );
}

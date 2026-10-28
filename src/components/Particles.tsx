/**
 * Soft dots drifting upward behind a dark panel. Pure CSS (`.particle` in globals.css), no JavaScript.
 * Positions come from a fixed formula, so server and client render the same markup.
 */
const DOTS = Array.from({ length: 34 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  top: (i * 53 + 7) % 100,
  size: 2 + (i % 4) * 1.5,
  delay: -((i * 1.7) % 14),
  duration: 12 + (i % 5) * 3,
  orange: i % 6 === 0,
}));

export function Particles() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {DOTS.map((d, i) => (
        <span
          key={i}
          className={`particle absolute rounded-full ${d.orange ? "bg-accent" : "bg-white"}`}
          style={{
            left: `${d.left}%`,
            top: `${d.top}%`,
            width: d.size,
            height: d.size,
            animationDelay: `${d.delay}s`,
            animationDuration: `${d.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

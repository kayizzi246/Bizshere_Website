/**
 * Small shapes floating behind the hero: outlined rings, plus signs and tiny squares in white
 * and orange, drifting up on a slight diagonal while turning and twinkling. Pure CSS
 * (`.particle` in globals.css), no JavaScript, no glow. Positions come from a fixed formula,
 * so server and client render the same markup.
 */
type Shape = "ring" | "plus" | "square";
const SHAPES: Shape[] = ["ring", "plus", "square", "ring", "plus"];

const ITEMS = Array.from({ length: 26 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  top: (i * 53 + 7) % 100,
  size: 8 + (i % 4) * 4,
  delay: -((i * 1.9) % 16),
  duration: 14 + (i % 5) * 3,
  shape: SHAPES[i % SHAPES.length],
  orange: i % 4 === 0,
}));

export function Particles() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {ITEMS.map((p, i) => {
        const colour = p.orange ? "#FE8302" : "#FFFFFF";
        return (
          <span
            key={i}
            className="particle absolute"
            style={{ left: `${p.left}%`, top: `${p.top}%`, width: p.size, height: p.size, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s` }}
          >
            {p.shape === "ring" ? (
              <span className="block h-full w-full rounded-full" style={{ border: `1.5px solid ${colour}` }} />
            ) : p.shape === "plus" ? (
              <svg viewBox="0 0 10 10" className="block h-full w-full" fill="none" stroke={colour} strokeWidth="1.6" strokeLinecap="round"><path d="M5 1v8M1 5h8" /></svg>
            ) : (
              <span className="block h-[60%] w-[60%] rounded-[2px]" style={{ background: colour }} />
            )}
          </span>
        );
      })}
    </div>
  );
}

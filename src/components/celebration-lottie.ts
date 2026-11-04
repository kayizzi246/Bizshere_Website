/**
 * Lottie animations for the welcome screen after a successful payment (src/components/Celebration.tsx),
 * built here as plain Lottie JSON (bodymovin 5.x) so there is no file to keep in sync:
 *   - badge:    a brand-blue circle pops in, a white check mark draws itself, a ring pulses out and
 *               sparks burst around it
 *   - confetti: brand-coloured pieces falling across the whole screen
 * Brand colours: #157EC2 (brand), #F28C28 (accent), #0E5E94 (deep), #34C38F (green).
 */
type Rgba = [number, number, number, number];
const hex = (h: string): Rgba => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255, 1];
const BRAND = hex("#157EC2");
const PALETTE = ["#157EC2", "#F28C28", "#0E5E94", "#34C38F", "#FFCB05", "#E8F2FA"].map(hex);

const still = <T,>(k: T) => ({ a: 0, k });
const ease = { i: { x: [0.2], y: [1] }, o: { x: [0.4], y: [0] } };
const springy = { i: { x: [0.3], y: [1.4] }, o: { x: [0.5], y: [0] } };
/** Animated value: [frame, value] pairs, eased between each. */
function anim(keys: [number, number[] | number][], curve = ease) {
  return { a: 1, k: keys.map(([t, s], n) => (n < keys.length - 1 ? { t, s: Array.isArray(s) ? s : [s], ...curve } : { t, s: Array.isArray(s) ? s : [s] })) };
}
const groupTransform = (extra: Record<string, unknown> = {}) => ({ ty: "tr", p: still([0, 0]), a: still([0, 0]), s: still([100, 100]), r: still(0), o: still(100), ...extra });
const layerTransform = (extra: Record<string, unknown> = {}) => ({ o: still(100), r: still(0), p: still([200, 200, 0]), a: still([0, 0, 0]), s: still([100, 100, 100]), ...extra });
function layer(ind: number, nm: string, ks: Record<string, unknown>, shapes: unknown[], op: number) {
  return { ddd: 0, ind, ty: 4, nm, sr: 1, ks, ao: 0, shapes, ip: 0, op, st: 0, bm: 0 };
}

export function badgeAnimation() {
  const op = 120;
  const sparks = Array.from({ length: 10 }, (_, n) => {
    const a = (n / 10) * Math.PI * 2 - Math.PI / 2;
    const [x, y] = [Math.cos(a), Math.sin(a)];
    return {
      ty: "gr", nm: `spark${n}`,
      it: [
        { ty: "el", p: still([0, 0]), s: still(n % 2 ? [12, 12] : [18, 18]), d: 1 },
        { ty: "fl", c: still(PALETTE[n % 4]), o: still(100), r: 1 },
        groupTransform({
          p: anim([[14, [x * 70, y * 70]], [44, [x * 165, y * 165]]]),
          s: anim([[14, [0, 0]], [22, [100, 100]], [48, [0, 0]]]),
        }),
      ],
    };
  });
  return {
    v: "5.7.4", fr: 60, ip: 0, op, w: 400, h: 400, nm: "membership-badge", ddd: 0, assets: [],
    layers: [
      layer(1, "check", layerTransform({ s: anim([[0, [0, 0, 100]], [22, [100, 100, 100]]], springy) }), [
        {
          ty: "gr", nm: "tick",
          it: [
            { ty: "sh", ks: still({ i: [[0, 0], [0, 0], [0, 0]], o: [[0, 0], [0, 0], [0, 0]], v: [[-38, 2], [-12, 28], [40, -26]], c: false }) },
            { ty: "st", c: still([1, 1, 1, 1]), o: still(100), w: still(16), lc: 2, lj: 2 },
            { ty: "tm", s: still(0), e: anim([[20, 0], [44, 100]]), o: still(0), m: 1 },
            groupTransform(),
          ],
        },
      ], op),
      layer(2, "circle", layerTransform({ s: anim([[0, [0, 0, 100]], [22, [100, 100, 100]]], springy) }), [
        { ty: "gr", nm: "disc", it: [{ ty: "el", p: still([0, 0]), s: still([170, 170]), d: 1 }, { ty: "fl", c: still(BRAND), o: still(100), r: 1 }, groupTransform()] },
      ], op),
      layer(3, "ring", layerTransform({ s: anim([[12, [100, 100, 100]], [56, [175, 175, 100]]]), o: anim([[12, 70], [56, 0]]) }), [
        { ty: "gr", nm: "ring", it: [{ ty: "el", p: still([0, 0]), s: still([170, 170]), d: 1 }, { ty: "st", c: still(BRAND), o: still(100), w: still(6), lc: 2, lj: 2 }, groupTransform()] },
      ], op),
      layer(4, "sparks", layerTransform(), sparks, op),
    ],
  };
}

/** Confetti over a 1000×1000 canvas, shown with "slice" scaling so it fills any screen. Seeded, so it is the same every time. */
export function confettiAnimation() {
  const op = 210;
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const pieces = Array.from({ length: 70 }, (_, n) => {
    const x = rnd() * 1000;
    const drift = (rnd() - 0.5) * 220;
    const start = Math.round(rnd() * 70);
    const end = start + 110 + Math.round(rnd() * 50);
    const spin = (rnd() > 0.5 ? 1 : -1) * (360 + rnd() * 540);
    const [w, h] = rnd() > 0.35 ? [14 + rnd() * 10, 7 + rnd() * 5] : [11, 11];
    return {
      ty: "gr", nm: `piece${n}`,
      it: [
        w === h ? { ty: "el", p: still([0, 0]), s: still([w, h]), d: 1 } : { ty: "rc", p: still([0, 0]), s: still([w, h]), r: still(2), d: 1 },
        { ty: "fl", c: still(PALETTE[n % PALETTE.length]), o: still(100), r: 1 },
        groupTransform({
          p: anim([[start, [x, -40]], [end, [x + drift, 1060]]], { i: { x: [0.6], y: [1] }, o: { x: [0.3], y: [0] } }),
          r: anim([[start, 0], [end, spin]]),
          s: anim([[start, [100, 100]], [start + 20, [100, -100]], [start + 40, [100, 100]], [start + 60, [100, -100]], [end, [100, 100]]]),
        }),
      ],
    };
  });
  return {
    v: "5.7.4", fr: 60, ip: 0, op, w: 1000, h: 1000, nm: "membership-confetti", ddd: 0, assets: [],
    layers: [layer(1, "confetti", layerTransform({ p: still([0, 0, 0]) }), pieces, op)],
  };
}

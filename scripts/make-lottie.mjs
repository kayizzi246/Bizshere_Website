/**
 * Builds the homepage's small Lottie animations (public/lottie/*.json), drawn here from simple
 * shapes in the brand colours, so there are no third-party files or licences to track.
 *
 *   node scripts/make-lottie.mjs
 *
 * Each is 120×120, 30 frames a second, and loops every 2 seconds (60 frames).
 */
import { mkdirSync, writeFileSync } from "node:fs";

const FR = 30, OP = 60, W = 120;
const hex = (h) => [...h.match(/\w\w/g).map((x) => Math.round((parseInt(x, 16) / 255) * 1000) / 1000), 1];
// Each in its service's colour (S in src/components/HomeFeatures.tsx): Tools teal, Tips magenta, Forum gold
const C = {
  ink: hex("071A33"), white: hex("FFFFFF"),
  teal: hex("0F766E"), tealSoft: hex("D5EFEC"), tealLight: hex("5EB8AF"),
  magenta: hex("BE185D"), magentaSoft: hex("FCE7F1"), magentaLight: hex("F472B6"),
  gold: hex("EAB308"), goldSoft: hex("FEF6D8"),
};

const still = (k) => ({ a: 0, k });
const ease = { i: { x: [0.4], y: [1] }, o: { x: [0.6], y: [0] } };
/** Animated value from [frame, value] pairs; the last pair holds. */
const anim = (...keys) => ({ a: 1, k: keys.map(([t, s], n) => (n === keys.length - 1 ? { t, s: [].concat(s) } : { t, s: [].concat(s), ...ease })) });

const tr = () => ({ ty: "tr", p: still([0, 0]), a: still([0, 0]), s: still([100, 100]), r: still(0), o: still(100), sk: still(0), sa: still(0) });
const fill = (c) => ({ ty: "fl", c: still(c), o: still(100), r: 1 });
const stroke = (c, w) => ({ ty: "st", c: still(c), o: still(100), w: still(w), lc: 2, lj: 2 });
const rect = (x, y, w, h, r = 0) => ({ ty: "rc", d: 1, p: still([x, y]), s: still([w, h]), r: still(r) });
const ellipse = (x, y, d) => ({ ty: "el", d: 1, p: still([x, y]), s: still([d, d]) });
const star = (x, y, outer) => ({ ty: "sr", sy: 1, d: 1, pt: still(4), p: still([x, y]), r: still(0), ir: still(outer * 0.32), is: still(0), or: still(outer), os: still(0) });
const group = (...it) => ({ ty: "gr", it: [...it, tr()] });

let ind = 0;
/** A layer: shapes plus its transform. `ks` overrides opacity, rotation, position, anchor or scale. */
const layer = (nm, shapes, ks = {}) => ({
  ddd: 0, ind: ++ind, ty: 4, nm, sr: 1, ao: 0, ip: 0, op: OP, st: 0, bm: 0,
  ks: { o: still(100), r: still(0), p: still([0, 0, 0]), a: still([0, 0, 0]), s: still([100, 100, 100]), ...ks },
  shapes,
});
const file = (nm, layers) => ({ v: "5.7.4", fr: FR, ip: 0, op: OP, w: W, h: W, nm, ddd: 0, assets: [], layers: layers.reverse() });

// Tools: a little chart whose three bars grow in turn, with a coin hopping above
function tools() {
  ind = 0;
  const base = 96;
  const bar = (x, h, color, delay) => layer(`bar${x}`, [group(rect(x, base - h / 2, 18, h, 5), fill(color))], {
    a: still([x, base, 0]), p: still([x, base, 0]),
    s: anim([delay, [100, 35, 100]], [delay + 18, [100, 100, 100]], [delay + 34, [100, 100, 100]], [delay + 50, [100, 35, 100]], [60, [100, 35, 100]]),
  });
  return file("tools", [
    layer("plate", [group(rect(60, 60, 104, 104, 26), fill(C.tealSoft))]),
    layer("base", [group(rect(60, base + 3, 76, 4, 2), fill(C.ink))]),
    bar(38, 34, C.tealLight, 0), bar(60, 50, C.teal, 6), bar(82, 66, C.ink, 12),
    layer("coin", [group(ellipse(0, 0, 16), fill(C.white), stroke(C.teal, 3))], {
      p: anim([0, [82, 24, 0]], [15, [82, 16, 0]], [30, [82, 24, 0]], [45, [82, 16, 0]], [60, [82, 24, 0]]),
    }),
  ]);
}

// Tips: a lightbulb that glows, with sparkles twinkling around it
function tips() {
  ind = 0;
  const sparkle = (x, y, size, delay) => layer(`spark${x}`, [group(star(0, 0, size), fill(C.magentaLight))], {
    p: still([x, y, 0]),
    s: anim([delay, [0, 0, 100]], [delay + 10, [100, 100, 100]], [delay + 22, [0, 0, 100]], [60, [0, 0, 100]]),
    r: anim([delay, 0], [delay + 22, 90], [60, 90]),
  });
  return file("tips", [
    layer("plate", [group(rect(60, 60, 104, 104, 26), fill(C.magentaSoft))]),
    layer("glow", [group(ellipse(0, 0, 44), fill(C.magenta))], {
      p: still([60, 52, 0]), o: anim([0, 0], [20, 22], [40, 0], [60, 0]), s: anim([0, [100, 100, 100]], [40, [160, 160, 100]], [60, [160, 160, 100]]),
    }),
    layer("bulb", [
      group(ellipse(60, 50, 40), fill(C.magenta)),
      group(rect(60, 74, 18, 12, 3), fill(C.magenta)),
      group(rect(60, 84, 14, 5, 2.5), fill(C.ink)),
      group(rect(60, 52, 10, 3, 1.5), fill(C.white)),
    ], { a: still([60, 88, 0]), p: still([60, 88, 0]), s: anim([0, [100, 100, 100]], [15, [106, 106, 100]], [30, [100, 100, 100]], [60, [100, 100, 100]]) }),
    sparkle(26, 30, 9, 4), sparkle(94, 26, 11, 16), sparkle(98, 70, 7, 30), sparkle(24, 72, 6, 40),
  ]);
}

// Forum: a chat bubble with "typing" dots, and a reply bubble popping up
function forum() {
  ind = 0;
  const dot = (x, delay) => layer(`dot${x}`, [group(ellipse(0, 0, 8), fill(C.ink))], {
    p: anim([delay, [x, 48, 0]], [delay + 8, [x, 41, 0]], [delay + 16, [x, 48, 0]], [60, [x, 48, 0]]),
  });
  return file("forum", [
    layer("plate", [group(rect(60, 60, 104, 104, 26), fill(C.goldSoft))]),
    layer("bubble", [group(rect(54, 48, 64, 38, 14), fill(C.gold)), group(rect(32, 64, 12, 12, 3), fill(C.gold))], {}),
    dot(42, 0), dot(54, 6), dot(66, 12),
    layer("reply", [group(rect(0, 0, 44, 26, 11), fill(C.ink)), group(rect(14, 9, 10, 10, 2), fill(C.ink)), group(rect(-6, -3, 20, 4, 2), fill(C.white)), group(rect(-9, 4, 14, 4, 2), fill(C.white))], {
      p: still([80, 84, 0]),
      s: anim([0, [0, 0, 100]], [24, [0, 0, 100]], [34, [108, 108, 100]], [40, [100, 100, 100]], [54, [100, 100, 100]], [60, [0, 0, 100]]),
    }),
  ]);
}

mkdirSync("public/lottie", { recursive: true });
for (const [name, data] of Object.entries({ tools: tools(), tips: tips(), forum: forum() })) {
  writeFileSync(`public/lottie/${name}.json`, JSON.stringify(data));
  console.log(`public/lottie/${name}.json`);
}

"use client";

import { useEffect } from "react";

/**
 * How every picture on the site sits in its frame (client, 12 Nov 2026):
 * - a photo with its own background (a JPG, or any picture with no see-through parts) fills the frame (cover);
 * - a cut-out with no background (a see-through PNG or WebP, like a machine on nothing) is shown whole, on a
 *   soft background colour (contain), so it is never cropped or left floating on the page.
 * Each picture is checked once when it loads: a small copy is drawn and its edges looked at for see-through
 * pixels. When a picture can't be read (another site that doesn't allow it), its file type decides: JPGs are
 * photos, PNG, WebP, GIF and SVG are taken as cut-outs. The result goes on the picture as data-fit (the
 * styles are in globals.css). Logos and icons in the header and footer, and anything marked data-nofit, are
 * left alone.
 */
const seen = new Map<string, "cover" | "contain">();
const SKIP = "header img, footer img, [data-nofit] img, img[data-nofit], [role=dialog] header img";

function byType(src: string): "cover" | "contain" {
  const path = src.split(/[?#]/)[0].toLowerCase();
  return /\.(png|webp|gif|svg)$/.test(path) ? "contain" : "cover";
}

function check(src: string): Promise<"cover" | "contain"> {
  const known = seen.get(src);
  if (known) return Promise.resolve(known);
  if (/\.(jpe?g)([?#]|$)/i.test(src)) { seen.set(src, "cover"); return Promise.resolve("cover"); }
  return new Promise((done) => {
    const probe = new Image();
    probe.crossOrigin = "anonymous";
    const finish = (fit: "cover" | "contain") => { seen.set(src, fit); done(fit); };
    probe.onerror = () => finish(byType(src));
    probe.onload = () => {
      try {
        const n = 24;
        const c = document.createElement("canvas");
        c.width = n; c.height = n;
        const g = c.getContext("2d", { willReadFrequently: true });
        if (!g) return finish(byType(src));
        g.drawImage(probe, 0, 0, n, n);
        const d = g.getImageData(0, 0, n, n).data;
        // see-through pixels along the edges: a cut-out
        let clear = 0, edge = 0;
        for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
          if (x > 1 && x < n - 2 && y > 1 && y < n - 2) continue;
          edge++;
          if (d[(y * n + x) * 4 + 3] < 200) clear++;
        }
        finish(clear / edge > 0.15 ? "contain" : "cover");
      } catch {
        finish(byType(src));
      }
    };
    probe.src = src;
  });
}

function fit(img: HTMLImageElement) {
  if (img.dataset.fit || img.matches(SKIP)) return;
  const src = img.currentSrc || img.src;
  if (!src || src.startsWith("data:") || src.startsWith("blob:")) return;
  // tiny pictures (icons, flags) stay as they are
  if (img.clientWidth && img.clientWidth < 40) return;
  check(src).then((f) => { if ((img.currentSrc || img.src) === src) img.dataset.fit = f; });
}

export function ImageFit() {
  useEffect(() => {
    document.querySelectorAll("img").forEach((i) => { if (i.complete && i.naturalWidth) fit(i); });
    const onLoad = (e: Event) => { if (e.target instanceof HTMLImageElement) fit(e.target); };
    document.addEventListener("load", onLoad, true);
    return () => document.removeEventListener("load", onLoad, true);
  }, []);
  return null;
}

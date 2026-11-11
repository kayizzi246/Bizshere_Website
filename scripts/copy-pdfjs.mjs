/**
 * Copies the PDF reader (pdf.js) into public/pdfjs, where the site's document reader
 * (src/components/PdfViewer.tsx) loads it from on phones. The two files must come from the
 * same version, so they are always copied together. Runs after every `npm install`;
 * the copies are also kept in git, so a missing package never breaks the site.
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const from = path.resolve("node_modules/pdfjs-dist/legacy/build");
const to = path.resolve("public/pdfjs");
const files = ["pdf.min.mjs", "pdf.worker.min.mjs"];

if (!files.every((f) => existsSync(path.join(from, f)))) {
  console.warn("copy-pdfjs: pdfjs-dist is not installed; keeping the copies already in public/pdfjs");
  process.exit(0);
}
mkdirSync(to, { recursive: true });
for (const f of files) copyFileSync(path.join(from, f), path.join(to, f));
console.log("copy-pdfjs: PDF reader copied to public/pdfjs");

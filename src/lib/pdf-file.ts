import { readFile } from "node:fs/promises";
import path from "node:path";

const MAX_BYTES = 30 * 1024 * 1024;

/** True when a file address ends in .pdf: such a file can be read on the site before downloading. */
export const isPdf = (src?: string | null) => Boolean(src && /\.pdf($|[?#])/i.test(src));

// Only public web addresses are fetched: never this server, an IP address or a local network name.
const fetchable = (src: string) => {
  try {
    const { protocol, hostname } = new URL(src);
    return protocol === "https:" && hostname.includes(".") && !/^[\d.]+$/.test(hostname) && !hostname.includes(":") && !/(^|\.)(localhost|local|internal)$/i.test(hostname);
  } catch {
    return false;
  }
};

/**
 * A PDF served from our own address, so a page can show it in the on-site reader (browsers won't
 * frame or read other sites' files) and offer a download (?download=1). The caller checks who may
 * see it first. Only PDFs: the file comes from public/ (uploads) or is fetched from its https
 * address. Anything else sends the visitor to the original address.
 */
export async function pdfResponse(src: string, req: Request, name: string): Promise<Response> {
  let bytes: Buffer | null = null;
  try {
    if (src.startsWith("/")) {
      const root = path.join(process.cwd(), "public");
      const file = path.join(root, path.normalize(src).replace(/^([/\\])+/, ""));
      if (file.startsWith(root) && /\.pdf$/i.test(file)) bytes = await readFile(file);
    } else if (fetchable(src)) {
      const res = await fetch(src, { signal: AbortSignal.timeout(15000) });
      const type = res.headers.get("content-type") ?? "";
      const size = Number(res.headers.get("content-length") ?? 0);
      if (res.ok && /application\/(pdf|octet-stream)/i.test(type) && size <= MAX_BYTES) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length <= MAX_BYTES) bytes = buf;
      }
    }
  } catch {
    bytes = null;
  }
  // Not a PDF we can show: send the visitor to the original address instead.
  if (!bytes || bytes.subarray(0, 5).toString() !== "%PDF-") return Response.redirect(src.startsWith("/") ? new URL(src, req.url) : src, 302);

  const download = new URL(req.url).searchParams.has("download");
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${name.replace(/[^\w.-]+/g, "-")}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}

"use client";

import { useRef, useState } from "react";
import { FileText, ImageIcon, Loader2, Upload } from "lucide-react";
import { upload } from "@vercel/blob/client";
import { allowedTypes, MAX_CLOUD_BYTES, MAX_LOCAL_BYTES, type UploadKind } from "@/lib/uploads";

/**
 * "Upload" next to a link field in the admin forms. Sends the file to storage (Vercel Blob,
 * or public/uploads in local development), then fills the field in the same form with the
 * file's address, so saving the form saves the link as usual.
 */
export function UploadButton({ target, kind }: { target: string; kind: UploadKind }) {
  const ref = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<{ busy?: boolean; error?: string; url?: string; name?: string }>({});
  const accept = allowedTypes(kind).join(",");

  const pick = async (file: File) => {
    setState({ busy: true, name: file.name });
    try {
      if (!allowedTypes(kind).includes(file.type)) throw new Error(kind === "image" ? "Choose a JPG, PNG, WebP or GIF image." : "Choose a PDF, image or Office document.");
      const { mode } = await fetch("/api/admin/upload").then((r) => r.json());
      let url: string;
      if (mode === "cloud") {
        if (file.size > MAX_CLOUD_BYTES) throw new Error("File is larger than 50 MB.");
        url = (await upload(file.name, file, { access: "public", handleUploadUrl: "/api/admin/upload", contentType: file.type })).url;
      } else if (mode === "local") {
        if (file.size > MAX_LOCAL_BYTES) throw new Error("File is larger than 20 MB.");
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/api/admin/upload", { method: "POST", body });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Upload failed");
        url = json.url;
      } else {
        throw new Error("Uploads are not set up yet. In Vercel, open Storage → Create → Blob and connect it to this project.");
      }
      // Fill the link field next to this button, and tell React-free listeners it changed.
      const field = ref.current?.form?.elements.namedItem(target) as HTMLInputElement | null;
      if (field) {
        field.value = url;
        field.dispatchEvent(new Event("input", { bubbles: true }));
      }
      setState({ url, name: file.name });
    } catch (e) {
      setState({ error: e instanceof Error ? e.message : "Upload failed" });
    } finally {
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input ref={ref} type="file" accept={accept} className="sr-only" tabIndex={-1} onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
        <button type="button" onClick={() => ref.current?.click()} disabled={state.busy}
          className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-dashed border-brand/50 bg-brand-tint px-3.5 text-xs font-semibold text-brand-dark hover:border-brand disabled:opacity-60">
          {state.busy ? <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" /> : <Upload aria-hidden className="h-3.5 w-3.5" />}
          {state.busy ? "Uploading…" : kind === "image" ? "Upload image" : "Upload PDF or file"}
        </button>
        <span className="text-[11px] font-normal text-ink-muted">{kind === "image" ? "JPG, PNG, WebP or GIF" : "PDF, Word, Excel, PowerPoint or image"}</span>
      </div>
      {state.error ? <span role="alert" className="text-xs font-semibold text-bad-fg">{state.error}</span> : null}
      {state.url ? (
        <span role="status" className="flex items-center gap-2.5 rounded-xl border border-line bg-page p-2 text-xs font-normal text-ink-soft">
          {kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element -- preview of the file just uploaded
            <img src={state.url} alt="" className="h-10 w-10 rounded-lg object-cover" />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface text-brand">{/\.pdf/i.test(state.url) ? <FileText aria-hidden className="h-5 w-5" /> : <ImageIcon aria-hidden className="h-5 w-5" />}</span>
          )}
          <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-ink">{state.name}</span>Uploaded. Save the form to keep it.</span>
        </span>
      ) : null}
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { uploadFile } from "./UploadButton";

/** How many photos one product may have (the main one and the extra ones). Checked again on the server. */
export const MAX_PRODUCT_PHOTOS = 8;

/**
 * Several photos for one product (client, 11 Nov 2026): tap "Add photos" and choose one or many at once.
 * The first photo is the main one, shown on the cards; tap another photo's "Make main" to change it, × to
 * take one off. Used two ways:
 *   - in a form (the supplier dashboard): leave `onChange` out and it sends the photos itself, the main one
 *     as `imageUrl` and the others as `moreImages`;
 *   - controlled (the admin's product window): pass `onChange` and keep the list yourself.
 */
export function ProductPhotos({ initial, onChange, mainName = "imageUrl", extraName = "moreImages" }: { initial: string[]; onChange?: (photos: string[]) => void; mainName?: string; extraName?: string }) {
  const [own, setOwn] = useState(initial);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const photos = onChange ? initial : own;
  const set = (next: string[]) => (onChange ? onChange(next) : setOwn(next));

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setError("");
    const room = MAX_PRODUCT_PHOTOS - photos.length;
    const chosen = [...files].slice(0, room);
    if (files.length > room) setError(`A product can have ${MAX_PRODUCT_PHOTOS} photos. Only the first ${room} were added.`);
    setBusy(chosen.length);
    let list = photos;
    for (const file of chosen) {
      try { list = [...list, await uploadFile(file, "image")]; set(list); }
      catch (e) { setError((e as Error).message); }
      setBusy((n) => n - 1);
    }
    setBusy(0);
    if (input.current) input.current.value = "";
  };

  return (
    <div className="flex flex-col gap-2">
      {onChange ? null : (
        <>
          <input type="hidden" name={mainName} value={photos[0] ?? ""} />
          {photos.slice(1).map((p) => <input key={p} type="hidden" name={extraName} value={p} />)}
        </>
      )}
      <ul className="flex flex-wrap gap-2">
        {photos.map((p, n) => (
          <li key={p} className="relative h-20 w-20 overflow-hidden rounded-xl border border-line bg-white sm:h-24 sm:w-24">
            {/* eslint-disable-next-line @next/next/no-img-element -- just uploaded, or an address typed before */}
            <img src={p} alt={`Photo ${n + 1}`} className="h-full w-full object-contain" />
            {n === 0
              ? <span className="absolute inset-x-0 bottom-0 bg-brand py-0.5 text-center text-[10px] font-bold text-white">Main photo</span>
              : <button type="button" onClick={() => set([p, ...photos.filter((x) => x !== p)])} className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center text-[10px] font-semibold text-white hover:bg-brand">Make main</button>}
            <button type="button" onClick={() => set(photos.filter((x) => x !== p))} aria-label={`Remove photo ${n + 1}`} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-ink shadow hover:bg-bad-bg hover:text-bad-fg"><X aria-hidden className="h-3.5 w-3.5" /></button>
          </li>
        ))}
        {Array.from({ length: busy }, (_, n) => (
          <li key={`busy-${n}`} className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-line-strong bg-page text-ink-muted sm:h-24 sm:w-24"><Loader2 aria-hidden className="h-5 w-5 animate-spin" /></li>
        ))}
        {photos.length + busy < MAX_PRODUCT_PHOTOS ? (
          <li>
            <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-brand/50 bg-brand-tint text-center text-[11px] font-semibold text-brand-dark hover:border-brand sm:h-24 sm:w-24">
              <ImagePlus aria-hidden className="h-5 w-5" />{photos.length ? "Add more" : "Add photos"}
              <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(e) => add(e.target.files)} />
            </label>
          </li>
        ) : null}
      </ul>
      <span className="text-[12px] text-ink-muted">Up to {MAX_PRODUCT_PHOTOS} photos. You can choose several at once. The first one is the main photo.</span>
      {error ? <span role="alert" className="text-[12px] font-semibold text-bad-fg">{error}</span> : null}
    </div>
  );
}

import { videoId } from "./youtube";

/**
 * Helpers for Business Tips shown as posts (src/app/(site)/tips). Server only (videoId lives with the
 * YouTube code, which reads the database).
 */

/** Minutes to read, at about 200 words a minute; never less than one. */
export const readMinutes = (text?: string | null) => Math.max(1, Math.round((text ?? "").trim().split(/\s+/).filter(Boolean).length / 200));

/** The YouTube id of a tip's video link, when it is one. */
export const tipVideo = (url?: string | null) => (url ? videoId(url) : null);

/** The picture for a tip's card: its photo, else its YouTube video's thumbnail, else none. */
export function tipPicture(tip?: { pictureUrl: string | null; videoUrl: string | null } | null) {
  if (tip?.pictureUrl) return tip.pictureUrl;
  const id = tipVideo(tip?.videoUrl);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

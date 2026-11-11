/**
 * Small helpers for Business Tips shown as blog posts (src/app/(site)/tips). Tips have no picture, so each
 * gets a coloured cover picked from its topic's name: the same topic always has the same colour.
 */
const COVERS = [
  "bg-gradient-to-br from-[#BE185D] to-[#7C1241]",
  "bg-gradient-to-br from-[#157EC2] to-[#0E5E94]",
  "bg-gradient-to-br from-[#0F766E] to-[#0A4F4A]",
  "bg-gradient-to-br from-[#4338CA] to-[#2B2590]",
  "bg-gradient-to-br from-[#C2410C] to-[#8A2C06]",
  "bg-gradient-to-br from-[#0F5B3E] to-[#0A3F2B]",
];

export function tipCover(topic?: string | null) {
  const name = topic ?? "";
  let n = 0;
  for (let i = 0; i < name.length; i++) n = (n * 31 + name.charCodeAt(i)) >>> 0;
  return COVERS[n % COVERS.length];
}

/** Minutes to read, at about 200 words a minute; never less than one. */
export const readMinutes = (text?: string | null) => Math.max(1, Math.round((text ?? "").trim().split(/\s+/).filter(Boolean).length / 200));

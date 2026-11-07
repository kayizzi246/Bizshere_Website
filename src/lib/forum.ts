import type { Prisma } from "@prisma/client";

/**
 * The Business Forum and the remarks under Business Tips: what a chat message looks like on its way to
 * the page, and how a person's name is shown. Shared by the pages, the server actions
 * (src/app/actions/community.ts) and the live-update route (src/app/api/forum/[id]/route.ts).
 *
 * Tables: forum_topics, forum_posts, business_tips, business_tip_remarks (prisma/schema.prisma).
 * Anyone can read; members (and the team) can write. The team hides or closes things at /admin/forum.
 */

export const BODY_MAX = 2000;
export const TITLE_MAX = 120;
/** Messages a topic opens with; older ones load with "Show earlier messages". */
export const PAGE = 80;

/** First name and the first letter of the last: enough to know who is talking, never a phone number or email. */
export function shortName(name: string | null | undefined): string {
  const clean = (name ?? "").replace(/\S+@\S+/g, "").replace(/\+?\d[\d\s-]{5,}/g, "").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (!parts.length) return "Member";
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

/** What the page gets for each message: no ids of people, no contact details. */
export type ChatMessage = {
  id: string;
  body: string;
  at: string; // ISO time
  name: string;
  team: boolean;
  mine: boolean;
  reply: { id: string; name: string; body: string } | null;
};

const author = { select: { id: true, name: true, role: true } } as const;

export const messageSelect = {
  id: true, body: true, createdAt: true, authorId: true,
  author,
  replyTo: { select: { id: true, body: true, hiddenAt: true, author } },
} satisfies Prisma.ForumPostSelect;

type Row = Prisma.ForumPostGetPayload<{ select: typeof messageSelect }>;

const isTeam = (role: string) => role === "ADMIN" || role === "EDITOR";

export function toMessage(p: Row, viewerId: string | null): ChatMessage {
  return {
    id: p.id,
    body: p.body,
    at: p.createdAt.toISOString(),
    name: isTeam(p.author.role) ? "BizSphere team" : shortName(p.author.name),
    team: isTeam(p.author.role),
    mine: Boolean(viewerId) && p.authorId === viewerId,
    reply: p.replyTo ? {
      id: p.replyTo.id,
      name: isTeam(p.replyTo.author.role) ? "BizSphere team" : shortName(p.replyTo.author.name),
      body: p.replyTo.hiddenAt ? "This message was removed" : p.replyTo.body.slice(0, 160),
    } : null,
  };
}

/** Kampala time on both the server and the browser, so the page never changes after it loads. */
const TZ = "Africa/Kampala";
export const clock = (iso: string) => new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(new Date(iso));
export const day = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: TZ }).format(new Date(iso));

/** "5 min ago", "3 h ago", then the date: for topic lists, made on the server only. */
export function ago(d: Date, now = new Date()) {
  const min = Math.round((now.getTime() - d.getTime()) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  if (min < 24 * 60) return `${Math.round(min / 60)} h ago`;
  return day(d.toISOString());
}

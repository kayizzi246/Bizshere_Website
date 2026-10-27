import { prisma } from "./prisma";

/**
 * YouTube on the homepage, set at /admin/video. No API key needed:
 *   - live:   the channel's /live page points at a video that is streaming now
 *   - latest: the channel's public RSS feed
 *   - else:   the featured video the admin picked, if any
 * Results are cached in memory for a minute so the homepage never waits on YouTube twice.
 */

export const SETTING = { channel: "youtube.channelId", featured: "youtube.featuredVideo" } as const;

export type HomeVideo = {
  channelId: string | null;
  video: { id: string; title: string | null; live: boolean } | null;
};

const ID = /^UC[\w-]{22}$/;
const VIDEO = /^[\w-]{11}$/;
const HEADERS = { "accept-language": "en", cookie: "CONSENT=YES+1", "user-agent": "Mozilla/5.0 (compatible; BizSphereBot/1.0)" };

async function get(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: HEADERS, cache: "no-store", signal: AbortSignal.timeout(4000) });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

/** A video id from an id, a watch / youtu.be / shorts / live / embed link, or null. */
export function videoId(input: string): string | null {
  const s = input.trim();
  if (VIDEO.test(s)) return s;
  const m = /(?:v=|youtu\.be\/|\/shorts\/|\/live\/|\/embed\/)([\w-]{11})/.exec(s);
  return m ? m[1] : null;
}

/** Channel id from "UC…", a /channel/UC… link, or an @handle (looked up on YouTube). */
export async function resolveChannel(input: string): Promise<string | null> {
  const s = input.trim();
  if (ID.test(s)) return s;
  const direct = /\/channel\/(UC[\w-]{22})/.exec(s);
  if (direct) return direct[1];
  const handle = /@([\w.-]+)/.exec(s)?.[1];
  if (!handle) return null;
  const html = await get(`https://www.youtube.com/@${handle}`);
  return html ? (/"externalId":"(UC[\w-]{22})"/.exec(html) ?? /"channelId":"(UC[\w-]{22})"/.exec(html))?.[1] ?? null : null;
}

async function liveNow(channelId: string): Promise<{ id: string; title: string | null } | null> {
  const html = await get(`https://www.youtube.com/channel/${channelId}/live`);
  // The player data says "isLive":true while streaming; a scheduled stream says "isUpcoming":true instead.
  if (!html || !(html.includes('"isLive":true') || html.includes('"isLiveNow":true')) || html.includes('"isUpcoming":true')) return null;
  const id = /<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/.exec(html)?.[1];
  if (!id) return null;
  const title = /<meta name="title" content="([^"]*)"/.exec(html)?.[1] ?? null;
  return { id, title: title && decode(title) };
}

async function latest(channelId: string): Promise<{ id: string; title: string | null } | null> {
  const xml = await get(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
  const entry = xml ? /<entry>([\s\S]*?)<\/entry>/.exec(xml)?.[1] : null;
  const id = entry ? /<yt:videoId>([\w-]{11})<\/yt:videoId>/.exec(entry)?.[1] : null;
  if (!entry || !id) return null;
  const title = /<title>([^<]*)<\/title>/.exec(entry)?.[1] ?? null;
  return { id, title: title && decode(title) };
}

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

let cache: { at: number; key: string; value: HomeVideo } | null = null;
const TTL = 60_000;

export async function homeVideo(): Promise<HomeVideo> {
  const rows = await prisma.siteSetting.findMany({ where: { key: { in: [SETTING.channel, SETTING.featured] } } });
  const channelId = rows.find((r) => r.key === SETTING.channel)?.value || null;
  const featured = rows.find((r) => r.key === SETTING.featured)?.value || null;
  const key = `${channelId}|${featured}`;
  if (cache && cache.key === key && Date.now() - cache.at < TTL) return cache.value;

  let video: HomeVideo["video"] = null;
  if (channelId) {
    const live = await liveNow(channelId);
    if (live) video = { ...live, live: true };
  }
  if (!video && featured) video = { id: featured, title: null, live: false };
  if (!video && channelId) {
    const last = await latest(channelId);
    if (last) video = { ...last, live: false };
  }
  const value = { channelId, video };
  cache = { at: Date.now(), key, value };
  return value;
}

/** Call after the admin changes the settings so the homepage updates straight away. */
export function clearVideoCache() {
  cache = null;
}

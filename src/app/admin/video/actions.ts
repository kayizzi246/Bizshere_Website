"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { SITE_DATA } from "@/lib/cached";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/access";
import { audit } from "@/lib/audit";
import { clearVideoCache, resolveChannel, SETTING, videoId } from "@/lib/youtube";

const fail = (message: string) => redirect(`/admin/video?error=${encodeURIComponent(message)}`);

async function put(key: string, value: string | null) {
  if (value) await prisma.siteSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
  else await prisma.siteSetting.deleteMany({ where: { key } });
}

/** Saves the YouTube channel (id, link or @handle) and the optional featured video. */
export async function saveVideoSettings(form: FormData) {
  const editor = await requireStaff();
  const channelRaw = String(form.get("channel") ?? "").trim();
  const featuredRaw = String(form.get("featured") ?? "").trim();

  const channel = channelRaw ? await resolveChannel(channelRaw) : null;
  if (channelRaw && !channel) fail("We couldn't find that channel. Paste the channel link (youtube.com/@yourname or youtube.com/channel/UC…).");
  const featured = featuredRaw ? videoId(featuredRaw) : null;
  if (featuredRaw && !featured) fail("That doesn't look like a YouTube video link.");

  await put(SETTING.channel, channel);
  await put(SETTING.featured, featured);
  clearVideoCache();
  await audit(editor.id, "site_setting.video", "site_setting", SETTING.channel, { channel, featured });
  revalidatePath("/");
  revalidateTag(SITE_DATA);
  redirect("/admin/video?saved=1");
}

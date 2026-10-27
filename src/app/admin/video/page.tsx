import { prisma } from "@/lib/prisma";
import { homeVideo, SETTING } from "@/lib/youtube";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import { saveVideoSettings } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Homepage video" };

export default async function AdminVideoPage({ searchParams }: { searchParams: { error?: string; saved?: string } }) {
  const [rows, yt] = await Promise.all([
    prisma.siteSetting.findMany({ where: { key: { in: [SETTING.channel, SETTING.featured] } } }),
    homeVideo(),
  ]);
  const channel = rows.find((r) => r.key === SETTING.channel)?.value ?? "";
  const featured = rows.find((r) => r.key === SETTING.featured)?.value ?? "";
  const showing = !yt.video ? "Nothing yet: the homepage shows a “coming soon” panel."
    : yt.video.live ? "LIVE: your live stream is on the homepage now."
    : yt.video.id === featured ? "Your featured video."
    : "Your latest upload.";

  return (
    <>
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Homepage video</h1>
        <p className="text-sm text-ink-muted">The video in the homepage banner. When you go live on YouTube, your live stream replaces it automatically (checked every minute) and a LIVE item leads the updates bar.</p>
      </div>
      {searchParams.error ? <p role="alert" className="rounded-xl bg-bad-bg p-4 text-sm font-semibold text-bad-fg">{searchParams.error}</p> : null}
      {searchParams.saved ? <p role="status" className="rounded-xl bg-brand-tint p-4 text-sm font-bold text-brand-dark">Saved. The homepage is updated.</p> : null}

      <form action={saveVideoSettings} className="card flex flex-col gap-4 p-6">
        <h2 className="text-lg font-extrabold">YouTube</h2>
        <label className="label">
          YouTube channel
          <input name="channel" defaultValue={channel} placeholder="https://www.youtube.com/@yourchannel" className="input" />
          <span className="text-xs font-normal text-ink-muted">Paste your channel link, @handle or channel ID. Needed for going live and for showing your latest video.</span>
        </label>
        <label className="label">
          Featured video (optional)
          <input name="featured" defaultValue={featured ? `https://www.youtube.com/watch?v=${featured}` : ""} placeholder="https://www.youtube.com/watch?v=…" className="input" />
          <span className="text-xs font-normal text-ink-muted">Pin one video. Leave empty to always show your latest upload. A live stream always comes first.</span>
        </label>
        <div className="flex justify-end"><button className="btn-primary">Save</button></div>
      </form>

      <section className="card flex flex-col gap-3 p-6">
        <h2 className="text-lg font-extrabold">Showing now</h2>
        <p className="text-sm text-ink-soft">{showing}</p>
        {yt.video ? (
          <div className="relative aspect-video max-w-xl overflow-hidden rounded-xl bg-black">
            <YouTubePlayer id={yt.video.id} title={yt.video.title ?? "Homepage video"} live={yt.video.live} />
          </div>
        ) : null}
      </section>
    </>
  );
}

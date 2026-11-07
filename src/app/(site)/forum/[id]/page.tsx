import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { messageSelect, PAGE, shortName, toMessage } from "@/lib/forum";
import { ForumChat } from "@/components/ForumChat";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const t = await prisma.forumTopic.findUnique({ where: { id: params.id.slice(0, 64) }, select: { title: true, status: true } });
  return { title: t && t.status !== "HIDDEN" ? t.title : "Business Forum" };
}

/** One forum topic: its title, then the chat (src/components/ForumChat.tsx). */
export default async function TopicPage({ params }: { params: { id: string } }) {
  const viewer = await getViewer();
  const topic = await prisma.forumTopic.findUnique({
    where: { id: params.id.slice(0, 64) },
    select: { id: true, title: true, status: true, createdAt: true, category: { select: { name: true } }, author: { select: { name: true } } },
  });
  if (!topic || (topic.status === "HIDDEN" && !viewer.isStaff)) notFound();

  const rows = await prisma.forumPost.findMany({ where: { topicId: topic.id, hiddenAt: null }, orderBy: { createdAt: "desc" }, take: PAGE, select: messageSelect });
  const messages = rows.reverse().map((p) => toMessage(p, viewer.userId));
  const back = `/forum/${topic.id}`;
  const write = viewer.isMember ? ("member" as const)
    : viewer.userId ? { text: "Replying is for members.", href: "/membership", action: "Become a member" }
    : { text: "Log in as a member to reply.", href: `/login?callbackUrl=${encodeURIComponent(back)}`, action: "Log in" };

  return (
    <div className="container-site flex flex-col gap-3 pb-6 pt-4 sm:pt-6">
      <div className="flex items-start gap-3">
        <Link href="/forum" aria-label="All topics" className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink hover:border-brand hover:text-brand"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex min-w-0 flex-col">
          <h1 className="font-display text-[20px] font-extrabold leading-tight text-heading sm:text-[24px]">{topic.title}</h1>
          <span className="text-[13px] text-ink-muted">
            {[topic.category?.name ?? "General", `started by ${shortName(topic.author.name)}`].join(" · ")}
            {topic.status === "HIDDEN" ? <span className="badge-bad ml-2">Hidden from the website</span> : null}
          </span>
        </div>
      </div>
      <ForumChat topicId={topic.id} initial={messages} more={rows.length === PAGE} closed={topic.status === "CLOSED"} write={write} />
      <p className="text-center text-[12px] text-ink-muted">Be kind and stay on topic. Never share PINs or passwords, and take care before paying anyone you meet here.</p>
    </div>
  );
}

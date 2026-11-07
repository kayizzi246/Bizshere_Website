import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { messageSelect, PAGE, toMessage } from "@/lib/forum";

export const dynamic = "force-dynamic";

/**
 * A forum topic's messages for the chat screen (src/components/ForumChat.tsx).
 *   ?after=<ISO time>   new messages since then (the screen asks every few seconds while it is open)
 *   ?before=<ISO time>  the page of messages before then ("Show earlier messages")
 * Public, like the topic itself. Hidden messages and hidden topics are never sent.
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const url = new URL(req.url);
  const after = url.searchParams.get("after");
  const before = url.searchParams.get("before");
  const time = (v: string | null) => { const d = v ? new Date(v) : null; return d && !Number.isNaN(d.getTime()) ? d : null; };
  const since = time(after), until = time(before);
  if (!since && !until) return NextResponse.json({ error: "after or before" }, { status: 400 });

  const topic = await prisma.forumTopic.findUnique({ where: { id: params.id.slice(0, 64) }, select: { status: true } });
  if (!topic || topic.status === "HIDDEN") return NextResponse.json({ error: "not found" }, { status: 404 });

  const rows = await prisma.forumPost.findMany({
    where: { topicId: params.id, hiddenAt: null, createdAt: since ? { gte: since } : { lt: until! } },
    orderBy: { createdAt: since ? "asc" : "desc" },
    take: since ? 200 : PAGE,
    select: messageSelect,
  });
  const viewerId = (await getSession())?.user?.id ?? null;
  const messages = (since ? rows : rows.reverse()).map((p) => toMessage(p, viewerId));
  return NextResponse.json({ messages, closed: topic.status === "CLOSED", more: !since && rows.length === PAGE }, { headers: { "Cache-Control": "no-store" } });
}

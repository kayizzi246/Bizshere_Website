"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CornerUpLeft, Lock, SendHorizontal, X } from "lucide-react";
import { sendForumMessage } from "@/app/actions/community";
import { BODY_MAX, clock, day, type ChatMessage } from "@/lib/forum";

/**
 * A forum topic as a WhatsApp-style chat: bubbles, yours on the right in green, a day line between
 * days, Reply on any message, and a box at the bottom to write in. New messages from others appear
 * by themselves: the screen asks for them every few seconds while it is open and on screen, and less
 * often when the topic is quiet, so an idle tab costs the database next to nothing.
 */
const FAST = 5000, SLOW = 30000;

export function ForumChat({ topicId, initial, more, closed: closedAtStart, write }: {
  topicId: string;
  initial: ChatMessage[];
  more: boolean;
  closed: boolean;
  /** "member": can write; otherwise what stands in place of the box. */
  write: "member" | { text: string; href: string; action: string };
}) {
  const [messages, setMessages] = useState(initial);
  const [hasMore, setHasMore] = useState(more);
  const [closed, setClosed] = useState(closedAtStart);
  const [body, setBody] = useState("");
  const [reply, setReply] = useState<ChatMessage | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const list = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const stick = useRef(true); // at the bottom: follow new messages down
  const keep = useRef<number | null>(null); // after loading earlier ones: keep the view where it was
  const latest = useRef(initial.at(-1)?.at ?? new Date(0).toISOString());

  const merge = useCallback((incoming: ChatMessage[], where: "end" | "start") => {
    if (!incoming.length) return;
    setMessages((now) => {
      const seen = new Set(now.map((m) => m.id));
      const fresh = incoming.filter((m) => !seen.has(m.id));
      if (!fresh.length) return now;
      return where === "end" ? [...now, ...fresh] : [...fresh, ...now];
    });
    if (where === "end") latest.current = incoming.at(-1)!.at > latest.current ? incoming.at(-1)!.at : latest.current;
  }, []);

  // Open at the newest message; then follow new ones only while the reader is at the bottom.
  useLayoutEffect(() => {
    const el = list.current;
    if (!el) return;
    if (keep.current !== null) { el.scrollTop = el.scrollHeight - keep.current; keep.current = null; }
    else if (stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // New messages from others
  useEffect(() => {
    let timer = 0, wait = FAST, stop = false;
    const tick = async () => {
      if (!document.hidden) {
        try {
          const res = await fetch(`/api/forum/${topicId}?after=${encodeURIComponent(latest.current)}`, { cache: "no-store" });
          if (res.ok) {
            const data = (await res.json()) as { messages: ChatMessage[]; closed: boolean };
            const before = latest.current;
            merge(data.messages, "end");
            setClosed(data.closed);
            wait = latest.current !== before ? FAST : Math.min(SLOW, wait * 1.5);
          }
        } catch { wait = SLOW; }
      }
      if (!stop) timer = window.setTimeout(tick, wait);
    };
    timer = window.setTimeout(tick, FAST);
    const back = () => { if (!document.hidden) { wait = FAST; window.clearTimeout(timer); tick(); } };
    document.addEventListener("visibilitychange", back);
    return () => { stop = true; window.clearTimeout(timer); document.removeEventListener("visibilitychange", back); };
  }, [topicId, merge]);

  const earlier = async () => {
    const res = await fetch(`/api/forum/${topicId}?before=${encodeURIComponent(messages[0]?.at ?? new Date().toISOString())}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { messages: ChatMessage[]; more: boolean };
    keep.current = list.current ? list.current.scrollHeight - list.current.scrollTop : null;
    merge(data.messages, "start");
    setHasMore(data.more);
  };

  const send = async () => {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true); setError("");
    const r = await sendForumMessage({ topicId, body: text, replyToId: reply?.id ?? null }).catch(() => ({ error: "Not sent. Check your connection and try again." }));
    setSending(false);
    if ("error" in r) { setError(r.error); return; }
    stick.current = true;
    merge([r.message], "end");
    setBody(""); setReply(null);
    box.current?.focus();
  };

  const jump = (id: string) => {
    const el = document.getElementById(`m-${id}`);
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.animate([{ backgroundColor: "rgb(242 140 40 / 0.25)" }, { backgroundColor: "transparent" }], { duration: 1400 });
  };

  return (
    <div className="flex h-[calc(100svh-var(--hh)-150px)] min-h-[420px] flex-col overflow-hidden rounded-2xl border border-line bg-[#EFEAE2]">
      <div
        ref={list}
        onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}
        role="log" aria-live="polite" aria-label="Messages"
        className="flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-6"
      >
        {hasMore ? <div className="mb-3 flex justify-center"><button type="button" onClick={earlier} className="rounded-full bg-white/90 px-4 py-1.5 text-[13px] font-semibold text-brand shadow-sm hover:bg-white">Show earlier messages</button></div> : null}
        {!messages.length ? <p className="mt-10 text-center text-sm text-ink-muted">No messages yet. Say hello.</p> : null}
        <ol className="flex flex-col gap-1.5">
          {messages.map((m, n) => {
            const prev = messages[n - 1];
            const newDay = !prev || day(prev.at) !== day(m.at);
            const sameAuthor = prev && !newDay && prev.name === m.name && prev.mine === m.mine;
            return (
              <li key={m.id} className="flex flex-col">
                {newDay ? <span className="my-2 self-center rounded-lg bg-white/90 px-3 py-1 text-[12px] font-semibold text-ink-soft shadow-sm">{day(m.at)}</span> : null}
                <div id={`m-${m.id}`} className={`group flex max-w-[85%] flex-col rounded-2xl px-3 pb-1.5 pt-2 shadow-sm sm:max-w-[70%] ${m.mine ? "self-end rounded-tr-md bg-[#D9FDD3]" : "self-start rounded-tl-md bg-white"} ${sameAuthor ? "mt-0" : "mt-1.5"}`}>
                  {!m.mine && !sameAuthor ? (
                    <span className={`text-[13px] font-bold ${m.team ? "text-brand" : "text-[#0F5B3E]"}`}>{m.name}{m.team ? <span className="ml-1.5 rounded bg-brand-tint px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-brand-dark">Team</span> : null}</span>
                  ) : null}
                  {m.reply ? (
                    <button type="button" onClick={() => jump(m.reply!.id)} className="my-1 flex flex-col rounded-lg border-l-4 border-[#0F5B3E] bg-black/[0.05] px-2.5 py-1.5 text-left">
                      <span className="text-[12px] font-bold text-[#0F5B3E]">{m.reply.name}</span>
                      <span className="line-clamp-2 text-[13px] text-ink-soft">{m.reply.body}</span>
                    </button>
                  ) : null}
                  <p className="whitespace-pre-wrap break-words text-[15px] leading-snug text-ink">{m.body}</p>
                  <span className="mt-0.5 flex items-center justify-end gap-2 text-[11px] text-ink-muted">
                    {write === "member" && !closed ? (
                      <button type="button" onClick={() => { setReply(m); box.current?.focus(); }} className="inline-flex items-center gap-1 font-semibold text-ink-muted hover:text-brand sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100">
                        <CornerUpLeft aria-hidden className="h-3 w-3" />Reply
                      </button>
                    ) : null}
                    <time dateTime={m.at}>{clock(m.at)}</time>
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* The box to write in, or why there isn't one */}
      <div className="border-t border-black/5 bg-[#F0F2F5] p-2 sm:p-3">
        {closed ? (
          <p className="flex items-center justify-center gap-2 py-2 text-sm font-semibold text-ink-soft"><Lock aria-hidden className="h-4 w-4" />This topic is closed. You can still read it.</p>
        ) : write === "member" ? (
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex flex-col gap-2">
            {reply ? (
              <div className="flex items-start gap-2 rounded-xl border-l-4 border-[#0F5B3E] bg-white px-3 py-2">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[12px] font-bold text-[#0F5B3E]">Replying to {reply.mine ? "yourself" : reply.name}</span>
                  <span className="truncate text-[13px] text-ink-soft">{reply.body}</span>
                </span>
                <button type="button" onClick={() => setReply(null)} aria-label="Cancel reply" className="rounded-full p-1 text-ink-muted hover:bg-page"><X className="h-4 w-4" /></button>
              </div>
            ) : null}
            {error ? <p role="alert" className="rounded-lg bg-bad-bg px-3 py-2 text-[13px] font-semibold text-bad-fg">{error}</p> : null}
            <div className="flex items-end gap-2">
              <label className="sr-only" htmlFor="chat-box">Message</label>
              <textarea
                id="chat-box" ref={box} value={body} maxLength={BODY_MAX} rows={1} placeholder="Type a message"
                onChange={(e) => { setBody(e.target.value); e.target.style.height = "auto"; e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`; }}
                // Enter sends on a computer; on a phone it makes a new line, as in WhatsApp
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer: fine)").matches) { e.preventDefault(); send(); } }}
                className="max-h-[140px] min-h-[44px] flex-1 resize-none rounded-3xl border-0 bg-white px-4 py-2.5 text-[15px] text-ink outline-none ring-1 ring-black/5 focus:ring-2 focus:ring-[#0F5B3E]/40"
              />
              <button type="submit" disabled={sending || !body.trim()} aria-label="Send" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0F5B3E] text-white transition-colors hover:bg-[#0B4630] disabled:opacity-50">
                <SendHorizontal aria-hidden className="h-5 w-5" />
              </button>
            </div>
          </form>
        ) : (
          <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 py-1.5 text-center text-sm text-ink-soft">
            {write.text}
            <Link href={write.href} className="inline-flex h-10 items-center rounded-full bg-[#0F5B3E] px-5 text-sm font-bold text-white hover:bg-[#0B4630] hover:text-white">{write.action}</Link>
          </p>
        )}
      </div>
    </div>
  );
}

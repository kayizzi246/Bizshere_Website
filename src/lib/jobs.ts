/**
 * Daily maintenance jobs (blueprint 18: funding expiry handling, stale-price
 * indicators, review queues). Safe to run more than once a day.
 *
 * Run them from:
 *   - the command line:  npm run jobs   /   npm run jobs -- rounds   (scripts/jobs.ts)
 *   - Vercel Cron:       GET /api/cron/daily, scheduled in vercel.json
 * The jobs that text people (DAYTIME_JOBS) run from GET /api/cron/alerts at 09:00 in Kampala instead,
 * not with the others in the small hours.
 */
import type { ContentType } from "@prisma/client";
import { prisma } from "./prisma";
import { notifyMember, PARTNER_CODES, smsLink } from "./membership";
import { advancedSearch, parseSearch } from "./advanced-search";
import { sendSms } from "./sms";
import { sendEmail } from "./email";
import { site } from "@/config/site";

// Set at the start of every run, so a long-lived server never uses a stale date.
let now = new Date();
const days = (n: number) => new Date(now.getTime() + n * 86_400_000);

/** The weekly digest's words for each kind of page, singular and plural. */
const DIGEST_WORDS: Partial<Record<ContentType, [string, string]>> = {
  FUNDING_PROGRAMME: ["funding source", "funding sources"], SUPPLIER: ["supplier", "suppliers"], BUSINESS_IDEA: ["business idea", "business ideas"],
  MACHINE: ["machine", "machines"], BUSINESS_TIP: ["business tip", "business tips"], GUIDE: ["guide", "guides"], NEWS: ["news story", "news stories"],
  CONSULTANT: ["business expert", "business experts"], TOOL: ["tool", "tools"],
};
/** Most texts a run sends, so it finishes within the function's time limit; the rest go on the next day's run. */
const TEXTS_PER_RUN = 120;
const plural = (n: number, [one, many]: [string, string]) => `${n} ${n === 1 ? one : many}`;
/** "a, b and c" */
const listed = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);

const jobs: Record<string, () => Promise<string>> = {
  /**
   * Saved searches with the alert on: pages published since the last check that match the search. Each
   * gets an alert at /account, and each person at most one text and one email a day naming their searches.
   */
  async savedSearchAlerts() {
    const searches = await prisma.savedSearch.findMany({
      where: { alert: true, user: { isSuspended: false } },
      include: { user: { select: { id: true, name: true, phone: true, email: true, alertSmsAt: true } } },
    });
    const people = new Map<string, { user: (typeof searches)[number]["user"]; names: string[]; total: number }>();
    for (const s of searches) {
      const params = ((s.filters ?? {}) as { params?: string }).params ?? "";
      const sp: Record<string, string | string[]> = {};
      for (const [k, v] of new URLSearchParams(params)) { const was = sp[k]; sp[k] = was === undefined ? v : Array.isArray(was) ? [...was, v] : [was, v]; }
      if (!sp.q && s.query) sp.q = s.query;
      const { total } = await advancedSearch({ ...parseSearch(sp), page: 1 }, { member: false, newSince: s.lastRunAt ?? s.createdAt });
      await prisma.savedSearch.update({ where: { id: s.id }, data: { lastRunAt: now } });
      if (!total) continue;
      const name = s.query.trim() || "your saved search";
      await prisma.alert.create({
        data: { userId: s.userId, kind: "SAVED_SEARCH", savedSearchId: s.id, title: `${total} new for "${name}"`, body: `${total} new result${total === 1 ? "" : "s"} since we last looked.`, link: `/search?${params || new URLSearchParams({ q: s.query })}` },
      });
      const p = people.get(s.userId) ?? { user: s.user, names: [], total: 0 };
      p.names.push(name);
      p.total += total;
      people.set(s.userId, p);
    }
    let texts = 0, emails = 0;
    for (const { user, names, total } of people.values()) {
      if (texts >= TEXTS_PER_RUN) break;
      if (user.alertSmsAt && user.alertSmsAt > days(-0.9)) continue; // one a day
      const which = names.slice(0, 2).map((n) => `"${n.slice(0, 30)}"`).join(" and ") + (names.length > 2 ? ` and ${names.length - 2} more` : "");
      const text = `BizSphere-Ug: ${total} new result${total === 1 ? "" : "s"} for ${which}. See them: ${site.url}${smsLink("/account")}`;
      const [sms, mail] = await Promise.all([
        user.phone ? sendSms(user.phone, text) : false,
        user.email ? sendEmail(user.email, `New results for ${which}`, `Hello ${user.name || "there"},

${text}

Turn these alerts off at ${site.url}/account

BizSphere-Ug`) : false,
      ]);
      if (sms) texts++;
      if (mail) emails++;
      if (sms || mail) await prisma.user.update({ where: { id: user.id }, data: { alertSmsAt: now } });
    }
    return `saved-search alerts: ${people.size} people with new results, ${texts} texts, ${emails} emails`;
  },

  /**
   * The weekly "what's new" text, for people who turned it on: what was published in the last 7 days,
   * with a link to /new. Sent from Monday (Kampala time), once a week; nothing is sent in a week with
   * nothing new. DIGEST_ANY_DAY=1 sends it on any day (for testing).
   */
  async weeklyDigest() {
    const kampala = (d: Date) => new Date(d.toLocaleString("en-US", { timeZone: "Africa/Kampala" }));
    const local = kampala(now);
    const weekStart = new Date(now.getTime() - (((local.getDay() + 6) % 7) * 86_400_000) - ((local.getHours() * 60 + local.getMinutes()) * 60_000));
    if (process.env.DIGEST_ANY_DAY !== "1" && local.getDay() === 0) return "weekly digest: Sunday, waiting for Monday";
    const counts = await prisma.contentItem.groupBy({ by: ["contentType"], where: { publicationStatus: "PUBLISHED", publishedAt: { gt: days(-7), lte: now } }, _count: { _all: true } });
    const parts = counts.filter((c) => DIGEST_WORDS[c.contentType]).sort((a, b) => b._count._all - a._count._all).slice(0, 3).map((c) => plural(c._count._all, DIGEST_WORDS[c.contentType]!));
    if (!parts.length) return "weekly digest: nothing new this week, nothing sent";
    const people = await prisma.user.findMany({
      where: { digestSms: true, isSuspended: false, phone: { not: null }, OR: [{ digestSentAt: null }, { digestSentAt: { lt: weekStart } }] },
      select: { id: true, phone: true }, take: TEXTS_PER_RUN,
    });
    // "20 new funding sources, 6 guides and 5 business ideas"
    parts[0] = parts[0].replace(/^(\d+) /, "$1 new ");
    const text = `BizSphere-Ug this week: ${listed(parts)}. See them: ${site.url}/new  Stop: ${site.url}${smsLink("/account")}`;
    let sent = 0;
    for (const u of people) {
      if (await sendSms(u.phone!, text)) { sent++; await prisma.user.update({ where: { id: u.id }, data: { digestSentAt: now } }); }
    }
    return `weekly digest: ${sent} of ${people.length} sent`;
  },

  /** Open rounds whose start date has passed; close rounds whose deadline has passed. */
  async rounds() {
    const opened = await prisma.applicationRound.updateMany({ where: { status: "UPCOMING", opensAt: { lte: now }, OR: [{ closesAt: null }, { closesAt: { gt: now } }] }, data: { status: "OPEN" } });
    const closed = await prisma.applicationRound.updateMany({ where: { status: { in: ["OPEN", "UPCOMING"] }, isRolling: false, closesAt: { lte: now } }, data: { status: "CLOSED" } });
    return `rounds: ${opened.count} opened, ${closed.count} closed`;
  },

  /** Members who saved a programme or opportunity get one alert 7 days before it closes. */
  async deadlineAlerts() {
    const soon = await prisma.applicationRound.findMany({
      where: { status: "OPEN", isRolling: false, closesAt: { gt: now, lte: days(7) } },
      include: { programme: { include: { contentItem: { include: { savedBy: true } } } } },
    });
    let created = 0;
    for (const r of soon) {
      const item = r.programme.contentItem;
      for (const s of item.savedBy) {
        const exists = await prisma.alert.findFirst({ where: { userId: s.userId, contentItemId: item.id, kind: "DEADLINE", createdAt: { gte: days(-7) } } });
        if (exists) continue;
        await prisma.alert.create({ data: { userId: s.userId, kind: "DEADLINE", contentItemId: item.id, title: `${item.title} closes soon`, body: `Applications close on ${r.closesAt!.toDateString()}.`, link: `/funding/${item.slug}` } });
        created++;
      }
    }
    return `deadline alerts: ${created} created`;
  },

  /** Supplier quotes past their validity go back to review rather than showing as current. */
  async staleOffers() {
    const r = await prisma.supplierOffer.updateMany({ where: { status: "PUBLISHED", validUntil: { lt: now } }, data: { status: "IN_REVIEW" } });
    return `offers: ${r.count} expired quotes sent back to review`;
  },

  /**
   * Renewal reminders for weekly, monthly and yearly members with reminders on: 3 days and 1 day
   * before the membership ends (weekly: only the day before), and once when it has ended. By SMS to members who signed up with a phone, by
   * email to those with an email (both if they have both), plus an alert in /account. Each links to
   * the renewal pop-up. A day pass is too short for reminders. Each reminder goes once per period:
   * a payment clears the list (settlePayment in src/lib/membership.ts).
   */
  async renewals() {
    const subs = await prisma.subscription.findMany({
      where: { autoRenew: true, userId: { not: null }, period: { not: "DAILY" }, status: { in: ["ACTIVE", "PAST_DUE"] }, currentPeriodEnd: { gt: days(-3), lte: days(3) }, plan: { code: { in: ["member", ...Object.values(PARTNER_CODES)] } } },
      select: { id: true, userId: true, period: true, currentPeriodEnd: true, remindersSent: true, plan: { select: { code: true } } },
    });
    let sent = 0;
    for (const s of subs) {
      const end = s.currentPeriodEnd!;
      const stage = end <= now ? "ended" : end <= days(1) ? "1d" : "3d";
      if (stage === "3d" && s.period === "WEEKLY") continue;
      // Ran late: never send the earlier reminder after the later one
      if (s.remindersSent.includes(stage) || (stage === "3d" && s.remindersSent.includes("1d")) || (stage !== "ended" && s.remindersSent.includes("ended"))) continue;
      // The pricing page is open to everyone: signed out, the pop-up asks them to sign in first
      const link = `/membership?onboard=renew&period=${s.period}`;
      const when = end.toLocaleDateString("en-UG", { weekday: "long", day: "numeric", month: "long" });
      const msg = stage === "ended"
        ? { title: "Your membership has ended", text: `Your BizSphere-Ug membership ended on ${when}. Renew to open full budgets, contacts and funding terms again.`, link }
        : { title: stage === "1d" ? "Your membership renews tomorrow" : "Your membership renews in 3 days", text: `Your BizSphere-Ug membership is due for renewal on ${when}. Renew now with MoMo, Airtel Money or card to keep full access.`, link };
      // A supplier's or expert's listing has its own wording and renewal page
      const join = s.plan.code === PARTNER_CODES.supplier ? "/suppliers/join" : s.plan.code === PARTNER_CODES.expert ? "/experts/join" : null;
      const words = join
        ? { title: stage === "ended" ? "Your listing has ended" : "Your listing is due for renewal", text: stage === "ended" ? `Your BizSphere-Ug listing ended on ${when}. Renew now to keep your page live.` : `Your BizSphere-Ug listing is due for renewal on ${when}. Renew to keep your page live.`, link: join }
        : msg;
      await notifyMember(s.userId!, words).catch((e: Error) => console.error(`renewals: ${s.id}: ${e.message}`));
      await prisma.subscription.update({ where: { id: s.id }, data: { remindersSent: { push: stage } } });
      sent++;
    }
    return `renewals: ${sent} reminders sent`;
  },

  /** Rate-limit counters whose window has passed (src/lib/rate-limit.ts), and sign-in codes past their expiry. */
  async security() {
    const limits = await prisma.rateLimit.deleteMany({ where: { resetAt: { lt: now } } });
    const codes = await prisma.phoneCode.deleteMany({ where: { expiresAt: { lt: days(-1) } } });
    return `security: ${limits.count} rate-limit counters and ${codes.count} old sign-in codes cleared`;
  },

  /** Subscriptions past their period end without renewal become EXPIRED. */
  async subscriptions() {
    const r = await prisma.subscription.updateMany({ where: { status: { in: ["ACTIVE", "TRIAL", "PAST_DUE"] }, currentPeriodEnd: { lt: days(-3) } }, data: { status: "EXPIRED" } });
    const due = await prisma.subscription.updateMany({ where: { status: "ACTIVE", currentPeriodEnd: { lt: now, gte: days(-3) } }, data: { status: "PAST_DUE" } });
    return `subscriptions: ${due.count} past due, ${r.count} expired`;
  },

  /** A listing still unpaid 3 days after its period ended is hidden until it is renewed (partnerPaid brings it back). */
  async listings() {
    const item = { select: { id: true, publicationStatus: true } };
    const subs = await prisma.subscription.findMany({
      where: { plan: { code: { in: Object.values(PARTNER_CODES) } }, organizationId: { not: null }, currentPeriodEnd: { lt: days(-3) }, organization: { status: { not: "SUSPENDED" } } },
      select: { userId: true, organizationId: true, organization: { select: { supplier: { select: { contentItem: item } }, consultants: { select: { contentItem: item }, take: 1 } } } },
    });
    let hidden = 0;
    for (const s of subs) {
      const listing = s.organization?.supplier?.contentItem ?? s.organization?.consultants[0]?.contentItem;
      if (listing?.publicationStatus !== "PUBLISHED") continue;
      await prisma.$transaction([
        prisma.contentItem.update({ where: { id: listing.id }, data: { publicationStatus: "ARCHIVED" } }),
        prisma.organization.update({ where: { id: s.organizationId! }, data: { status: "SUSPENDED" } }),
      ]);
      hidden++;
    }
    return `listings: ${hidden} hidden for not renewing`;
  },

  /** Content with a passed expiry date is archived; content with a passed review date is reported. */
  async freshness() {
    const archived = await prisma.contentItem.updateMany({ where: { publicationStatus: "PUBLISHED", expiresAt: { lt: now } }, data: { publicationStatus: "ARCHIVED" } });
    const overdue = await prisma.contentItem.count({ where: { publicationStatus: "PUBLISHED", nextReviewDueAt: { lt: now } } });
    const stalePrices = await prisma.priceObservation.count({ where: { status: "PUBLISHED", observedAt: { lt: days(-30) } } });
    return `freshness: ${archived.count} expired items archived, ${overdue} reviews overdue, ${stalePrices} published prices older than 30 days`;
  },

  /** Checks external links on Useful Websites and records the HTTP status. */
  async links() {
    // Checked in parallel with a short timeout so the run fits a serverless time limit.
    const sites = await prisma.usefulWebsite.findMany({ where: { OR: [{ lastLinkCheckAt: null }, { lastLinkCheckAt: { lt: days(-7) } }] }, take: 25 });
    const results = await Promise.all(sites.map(async (s) => {
      let status = 0;
      let redirect: string | null = null;
      try {
        const res = await fetch(s.canonicalUrl, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(8_000) });
        status = res.status;
        redirect = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
      } catch {
        status = 0;
      }
      await prisma.usefulWebsite.update({ where: { id: s.id }, data: { lastLinkCheckAt: now, linkStatus: status, redirectUrl: redirect } });
      return status === 0 || status >= 400;
    }));
    return `links: ${sites.length} checked, ${results.filter(Boolean).length} broken`;
  },
};

/** The jobs that text people: run at 09:00 Kampala time (GET /api/cron/alerts), not with the night jobs. */
export const DAYTIME_JOBS = ["savedSearchAlerts", "weeklyDigest"];
/** The night jobs (GET /api/cron/daily, and npm run jobs with no names). */
export const JOB_NAMES = Object.keys(jobs).filter((n) => !DAYTIME_JOBS.includes(n));

/** Runs all jobs (or the named ones) and records the run in the audit log. */
export async function runJobs(only?: string[]) {
  now = new Date();
  const names = only?.length ? only : JOB_NAMES;
  const unknown = names.filter((n) => !jobs[n]);
  if (unknown.length) throw new Error(`Unknown job "${unknown.join(", ")}". Jobs: ${Object.keys(jobs).join(", ")}`);
  const results: string[] = [];
  for (const n of names) results.push(await jobs[n]());
  await prisma.auditLog.create({ data: { action: "jobs.run", entityType: "system", details: { jobs: names, results, at: now.toISOString() } } });
  return results;
}

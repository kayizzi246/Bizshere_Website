/**
 * Daily maintenance jobs (blueprint 18: funding expiry handling, stale-price
 * indicators, review queues). Safe to run more than once a day.
 *
 * Run them from:
 *   - the command line:  npm run jobs   /   npm run jobs -- rounds   (scripts/jobs.ts)
 *   - Vercel Cron:       GET /api/cron/daily, scheduled in vercel.json
 * The jobs that text people (DAYTIME_JOBS) run from GET /api/cron/alerts at 09:00 in Kampala instead,
 * not with the others in the small hours. HOURLY_JOBS (GET /api/cron/hourly) catch up with people
 * who started a payment and didn't finish, which only works while they still remember doing it.
 */
import type { ContentType } from "@prisma/client";
import { prisma } from "./prisma";
import { notifyMember, PARTNER_CODES, smsLink } from "./membership";
import { advancedSearch, parseSearch } from "./advanced-search";
import { sendSms } from "./sms";
import { sendEmail } from "./email";
import { site } from "@/config/site";
import { PERIOD_INFO } from "./billing";
import { money } from "./format";
import { getSetting } from "./settings";
import { snapshot } from "./watches";

// Set at the start of every run, so a long-lived server never uses a stale date.
let now = new Date();
const days = (n: number) => new Date(now.getTime() + n * 86_400_000);
const hours = (n: number) => new Date(now.getTime() + n * 3_600_000);

/** The hour of the day in Kampala (0–23), so nobody is texted while they are asleep. */
const kampalaHour = () => Number(now.toLocaleString("en-GB", { timeZone: "Africa/Kampala", hour: "2-digit", hour12: false }));
/** Texts go out between 07:00 and 20:59 Kampala time. */
const daytimeInKampala = () => kampalaHour() >= 7 && kampalaHour() < 21;

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

  /**
   * Payments that were started and never finished: the MoMo prompt timed out, the pop-up was
   * closed, the phone ran out of airtime. One text with a link straight back to the same plan,
   * sent between 1 and 48 hours after the attempt, while they still remember making it.
   *
   * Only one text per person per week, however many attempts they make, and never to someone who
   * has access by now. The text is recorded on the payment (recoverySentAt), so a restarted job
   * or a second run in the same hour never sends it twice.
   */
  async checkoutRecovery() {
    if (!daytimeInKampala()) return "checkout recovery: outside 07:00–21:00 in Kampala, nothing sent";
    const attempts = await prisma.payment.findMany({
      where: {
        status: { in: ["PENDING", "FAILED", "CANCELLED"] },
        recoverySentAt: null,
        createdAt: { lt: hours(-1), gt: hours(-48) },
        subscription: { userId: { not: null }, plan: { code: "member" } },
      },
      select: {
        id: true, amount: true, currency: true, period: true, createdAt: true, subscriptionId: true,
        subscription: { select: { id: true, userId: true, status: true, currentPeriodEnd: true, period: true } },
      },
      orderBy: { createdAt: "desc" },
      take: TEXTS_PER_RUN,
    });
    let sent = 0;
    const done = new Set<string>();
    for (const a of attempts) {
      const sub = a.subscription;
      const userId = sub.userId!;
      if (done.has(userId)) continue; // one reminder per person per run, about their latest attempt
      // They have access now (paid another way, or given time by hand): nothing to chase.
      if ((sub.status === "ACTIVE" || sub.status === "TRIAL") && (!sub.currentPeriodEnd || sub.currentPeriodEnd > now)) continue;
      const paid = await prisma.payment.findFirst({ where: { subscriptionId: sub.id, status: "SUCCEEDED" }, select: { id: true } });
      if (paid) continue;
      // Already chased this week (for this or an earlier attempt)
      const recent = await prisma.payment.findFirst({ where: { subscriptionId: sub.id, recoverySentAt: { gt: days(-7) } }, select: { id: true } });
      if (recent) continue;
      const period = a.period ?? sub.period;
      const info = PERIOD_INFO[period];
      await notifyMember(userId, {
        title: "You didn't finish your payment",
        text: `You started paying ${money(a.amount, a.currency)} for ${info.length} of full access on BizSphere-Ug but it didn't go through, and nothing was taken. Finish it here with MoMo, Airtel Money or card:`,
        link: `/membership?onboard=pay&period=${period}`,
      }).catch((e: Error) => console.error(`checkoutRecovery: ${a.id}: ${e.message}`));
      await prisma.payment.update({ where: { id: a.id }, data: { recoverySentAt: now } });
      done.add(userId);
      sent++;
    }
    return `checkout recovery: ${sent} of ${attempts.length} unfinished payments chased`;
  },

  /**
   * Members whose membership ended a week ago and who have not come back: one last text, naming
   * what they are missing and what the cheapest way back costs. Sent once per membership
   * (remindersSent gets "winback"), after the "your membership has ended" reminder the renewals
   * job sends on the day itself.
   */
  async winBack() {
    if (!daytimeInKampala()) return "win-back: outside 07:00–21:00 in Kampala, nothing sent";
    const subs = await prisma.subscription.findMany({
      where: {
        userId: { not: null }, plan: { code: "member" }, status: { in: ["EXPIRED", "PAST_DUE", "CANCELLED"] },
        currentPeriodEnd: { lt: days(-6), gt: days(-45) },
        NOT: { remindersSent: { has: "winback" } },
      },
      select: { id: true, userId: true, currentPeriodEnd: true, period: true },
      take: TEXTS_PER_RUN,
    });
    const plan = await prisma.membershipPlan.findUnique({ where: { code: "member" }, select: { priceDaily: true, priceWeekly: true, priceMonthly: true, currency: true } });
    const cheapest = plan?.priceDaily ?? plan?.priceWeekly ?? plan?.priceMonthly ?? null;
    const from = cheapest ? ` A day pass is ${money(cheapest, plan!.currency)}.` : "";
    let sent = 0;
    for (const s of subs) {
      await notifyMember(s.userId!, {
        title: "Come back to full access",
        text: `Your BizSphere-Ug membership ended, so budgets, supplier contacts, funding terms and market prices are locked again.${from} Open everything again in a minute with MoMo, Airtel Money or card:`,
        link: `/membership?onboard=pay&period=${s.period}`,
      }).catch((e: Error) => console.error(`winBack: ${s.id}: ${e.message}`));
      await prisma.subscription.update({ where: { id: s.id }, data: { remindersSent: { push: "winback" } } });
      sent++;
    }
    return `win-back: ${sent} former members texted`;
  },

  /**
   * Price watches (/prices "Watch"): members are texted when a watched product's wholesale price
   * has moved by priceWatch.move per cent or more since the last look, or when a new supplier
   * starts selling it. Each watch's price is written back every run, so a slow drift is reported
   * once it adds up rather than over and over.
   *
   * Only current members are texted; the watch of a lapsed member is kept and updated quietly
   * (the win-back job is what invites them back).
   */
  async priceAlerts() {
    const watches = await prisma.priceWatch.findMany({
      where: { user: { isSuspended: false } },
      select: { id: true, userId: true, productId: true, lastPrice: true, lastSuppliers: true, lastNotifiedAt: true, user: { select: { id: true, name: true, phone: true, email: true } } },
    });
    if (!watches.length) return "price alerts: nothing watched yet";
    const move = await getSetting("priceWatch.move");
    const prices = await snapshot([...new Set(watches.map((w) => w.productId))]);
    // Who may be told: a text about a price only goes to someone who can open the price board.
    const live = await prisma.subscription.findMany({
      where: { userId: { in: [...new Set(watches.map((w) => w.userId))] }, status: { in: ["ACTIVE", "TRIAL"] }, OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: now } }], plan: { code: "member" } },
      select: { userId: true },
    });
    const members = new Set(live.map((s) => s.userId));

    type News = { text: string; productId: string; name: string };
    const perPerson = new Map<string, { user: (typeof watches)[number]["user"]; news: News[]; watchIds: string[] }>();
    let updated = 0;
    for (const w of watches) {
      const s = prices.get(w.productId);
      if (!s) continue;
      const was = w.lastPrice === null ? null : Number(w.lastPrice);
      const newSuppliers = s.suppliers - w.lastSuppliers;
      const pct = was && s.price ? ((s.price - was) / was) * 100 : null;
      const moved = pct !== null && Math.abs(pct) >= move;
      // Today's numbers become the baseline whether or not anything is sent.
      await prisma.priceWatch.update({ where: { id: w.id }, data: { lastPrice: s.price, lastSuppliers: s.suppliers } });
      updated++;
      if (!moved && newSuppliers <= 0) continue;
      // Texted about this product at most once a day
      if (w.lastNotifiedAt && w.lastNotifiedAt > days(-0.9)) continue;
      if (!members.has(w.userId)) continue;
      const parts: string[] = [];
      if (moved) parts.push(`${pct! > 0 ? "up" : "down"} ${Math.abs(pct!).toFixed(0)}% to ${money(s.price!, s.currency)}${s.unit ? ` a ${s.unit}` : ""}`);
      if (newSuppliers > 0) parts.push(`${newSuppliers} new supplier${newSuppliers === 1 ? "" : "s"}`);
      const p = perPerson.get(w.userId) ?? { user: w.user, news: [], watchIds: [] };
      p.news.push({ text: `${s.name} ${listed(parts)}`, productId: s.productId, name: s.name });
      p.watchIds.push(w.id);
      perPerson.set(w.userId, p);
    }

    let texts = 0;
    for (const [userId, p] of perPerson) {
      // One alert per product in /account, one text naming the first two.
      for (const n of p.news) {
        await prisma.alert.create({ data: { userId, kind: "PRICE", title: n.text, body: "From the products you watch.", link: `/prices?q=${encodeURIComponent(n.name.split(",")[0])}` } }).catch(() => {});
      }
      if (texts >= TEXTS_PER_RUN) continue;
      const head = p.news.slice(0, 2).map((n) => n.text).join("; ");
      const rest = p.news.length > 2 ? ` and ${p.news.length - 2} more` : "";
      const text = `BizSphere-Ug prices you watch: ${head}${rest}. See every market: ${site.url}/prices`;
      const [sms, mail] = await Promise.all([
        p.user.phone ? sendSms(p.user.phone, text) : false,
        p.user.email ? sendEmail(p.user.email, "Prices you watch have moved", `Hello ${p.user.name || "there"},\n\n${text}\n\nStop these alerts at ${site.url}/account\n\nBizSphere-Ug`) : false,
      ]);
      if (sms || mail) {
        texts++;
        await prisma.priceWatch.updateMany({ where: { id: { in: p.watchIds } }, data: { lastNotifiedAt: now } });
      }
    }
    return `price alerts: ${updated} watches checked, ${perPerson.size} people with news, ${texts} texts`;
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
export const DAYTIME_JOBS = ["savedSearchAlerts", "weeklyDigest", "priceAlerts", "winBack"];
/** Every hour (GET /api/cron/hourly): catching up with unfinished payments while they are still fresh. */
export const HOURLY_JOBS = ["checkoutRecovery"];
/** The night jobs (GET /api/cron/daily, and npm run jobs with no names). */
export const JOB_NAMES = Object.keys(jobs).filter((n) => !DAYTIME_JOBS.includes(n) && !HOURLY_JOBS.includes(n));

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

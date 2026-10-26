/**
 * Daily maintenance jobs (blueprint 18: funding expiry handling, stale-price
 * indicators, review queues). Safe to run more than once a day.
 *
 *   npm run jobs            run everything
 *   npm run jobs -- rounds  run one job by name
 *
 * Schedule it once a day, e.g. cron `15 3 * * *` (03:15 EAT) or the host's scheduler.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const now = new Date();
const days = (n: number) => new Date(now.getTime() + n * 86_400_000);

const jobs: Record<string, () => Promise<string>> = {
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

  /** Subscriptions past their period end without renewal become EXPIRED. */
  async subscriptions() {
    const r = await prisma.subscription.updateMany({ where: { status: { in: ["ACTIVE", "TRIAL", "PAST_DUE"] }, currentPeriodEnd: { lt: days(-3) } }, data: { status: "EXPIRED" } });
    const due = await prisma.subscription.updateMany({ where: { status: "ACTIVE", currentPeriodEnd: { lt: now, gte: days(-3) } }, data: { status: "PAST_DUE" } });
    return `subscriptions: ${due.count} past due, ${r.count} expired`;
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
    const sites = await prisma.usefulWebsite.findMany({ where: { OR: [{ lastLinkCheckAt: null }, { lastLinkCheckAt: { lt: days(-7) } }] }, take: 50 });
    let broken = 0;
    for (const s of sites) {
      let status = 0;
      let redirect: string | null = null;
      try {
        const res = await fetch(s.canonicalUrl, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(10_000) });
        status = res.status;
        redirect = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
      } catch {
        status = 0;
      }
      if (status === 0 || status >= 400) broken++;
      await prisma.usefulWebsite.update({ where: { id: s.id }, data: { lastLinkCheckAt: now, linkStatus: status, redirectUrl: redirect } });
    }
    return `links: ${sites.length} checked, ${broken} broken`;
  },
};

async function main() {
  const only = process.argv[2];
  const names = only ? [only] : Object.keys(jobs);
  for (const n of names) {
    if (!jobs[n]) throw new Error(`Unknown job "${n}". Jobs: ${Object.keys(jobs).join(", ")}`);
    console.log(await jobs[n]());
  }
  await prisma.auditLog.create({ data: { action: "jobs.run", entityType: "system", details: { jobs: names, at: now.toISOString() } } });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

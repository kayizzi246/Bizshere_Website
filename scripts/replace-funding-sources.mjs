/**
 * Replaces every Funding Source with the client's list of 20 UK donor organisations
 * ("20 UK donor organisations – Grants & Funding for Projects in Uganda", Nov 2026).
 *
 *   node --env-file=.env scripts/replace-funding-sources.mjs            shows what would change, changes nothing
 *   node --env-file=.env scripts/replace-funding-sources.mjs --apply    does it
 *
 * Works on the database in DATABASE_URL. It removes every Funding Source page (and its programme
 * details), then the fund providers left with no programme, and their organisations when nothing else
 * uses them (no supplier page, members, experts, opportunities, subscriptions, documents or enquiries).
 * Investment opportunities are not touched. Then it adds the 20 donors, live, as grants.
 */
import { PrismaClient } from "@prisma/client";

// Name, focus area and website as in the list; the category is from the list's own headings
// (Business, Health, Education, Community development), with Children & youth for the children's charities.
const DONORS = [
  ["Comic Relief", "Poverty reduction & health", "www.comicrelief.com", "Community development"],
  ["British International Investment", "Private sector & business", "www.bii.co.uk", "Business"],
  ["British Council", "Education & culture", "www.britishcouncil.org", "Education"],
  ["The National Lottery Community Fund", "Communities & social projects", "www.tnlcommunityfund.org.uk", "Community development"],
  ["Global Innovation Fund", "Innovation & development", "www.globalinnovation.fund", "Business"],
  ["Charles Hayward Foundation", "Health & social welfare", "www.charleshaywardfoundation.org.uk", "Health"],
  ["Global Fund for Children", "Children & youth", "www.globalfundforchildren.org", "Children & youth"],
  ["Oxfam GB", "Poverty & humanitarian aid", "www.oxfam.org.uk", "Community development"],
  ["Sightsavers", "Blindness & neglected diseases", "www.sightsavers.org", "Health"],
  ["WaterAid", "Clean water & hygiene", "www.wateraid.org", "Health"],
  ["Plan International UK", "Children & gender equality", "www.plan-uk.org", "Children & youth"],
  ["CAFOD", "Development & humanitarian aid", "www.cafod.org.uk", "Community development"],
  ["Caritas Westminster", "Social action & charity", "www.caritaswestminster.org.uk", "Community development"],
  ["Save the Children UK", "Children's rights & welfare", "www.savethechildren.org.uk", "Children & youth"],
  ["UNICEF UK", "Children's rights & development", "www.unicef.org.uk", "Children & youth"],
  ["The Leprosy Mission UK", "Leprosy & disability support", "www.leprosymission.org.uk", "Health"],
  ["ActionAid UK", "Rights & poverty reduction", "www.actionaid.org.uk", "Community development"],
  ["Marie Stopes International", "Reproductive health", "www.mariestopes.org.uk", "Health"],
  ["The Prince's Trust", "Youth & skills development", "www.princes-trust.org.uk", "Education"],
  ["Concern Worldwide UK", "Humanitarian & development", "www.concern.net", "Community development"],
];

const apply = process.argv.includes("--apply");
const prisma = new PrismaClient();
const slugify = (s) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);

async function main() {
  const db = new URL(process.env.DATABASE_URL ?? "postgres://unknown").host;
  console.log(`Database: ${db}${apply ? "" : "   (dry run: nothing is changed; add --apply to do it)"}`);

  const old = await prisma.contentItem.findMany({
    where: { contentType: "FUNDING_PROGRAMME" },
    select: { id: true, title: true, fundingProgramme: { select: { providerId: true } } },
  });
  console.log(`\nRemove ${old.length} funding source(s):`);
  for (const o of old) console.log(`  - ${o.title}`);

  const providerIds = [...new Set(old.map((o) => o.fundingProgramme?.providerId).filter(Boolean))];
  // A provider stays if it still runs a programme that isn't being removed (none, after this), so all of these go
  const providers = await prisma.fundingProvider.findMany({
    where: { id: { in: providerIds } },
    select: { id: true, organization: { select: { id: true, legalName: true, _count: { select: { members: true, consultants: true, subscriptions: true, documents: true, enquiries: true, promotedOpportunities: true, submissions: true } }, supplier: { select: { id: true } } } } },
  });
  const orgsToDelete = providers.filter((p) => !p.organization.supplier && Object.values(p.organization._count).every((n) => n === 0)).map((p) => p.organization);
  console.log(`Remove ${providers.length} fund provider(s), and ${orgsToDelete.length} of their organisations that nothing else uses.`);

  const taken = await prisma.contentItem.findMany({ where: { slug: { in: DONORS.map(([n]) => slugify(n)) }, contentType: { not: "FUNDING_PROGRAMME" } }, select: { slug: true } });
  console.log(`\nAdd ${DONORS.length} UK donor organisations as live grants.`);
  if (taken.length) console.log(`  (web addresses already used by other pages get "-fund" added: ${taken.map((t) => t.slug).join(", ")})`);
  if (!apply) return;

  await prisma.$transaction(async (tx) => {
    await tx.contentItem.deleteMany({ where: { id: { in: old.map((o) => o.id) } } }); // programmes go with them
    await tx.fundingProvider.deleteMany({ where: { id: { in: providers.map((p) => p.id) } } });
    await tx.organization.deleteMany({ where: { id: { in: orgsToDelete.map((o) => o.id) } } });

    const now = new Date();
    const usedSlugs = new Set(taken.map((t) => t.slug));
    // Funding's categories are industries (src/lib/categories.ts): reuse one of the same name, or add it
    const categoryId = async (name) => {
      const same = await tx.category.findFirst({ where: { kind: "INDUSTRY", name: { equals: name, mode: "insensitive" } }, select: { id: true } });
      if (same) return same.id;
      const base = slugify(name);
      let slug = base;
      for (let n = 2; await tx.category.findUnique({ where: { kind_slug: { kind: "INDUSTRY", slug } }, select: { id: true } }); n++) slug = `${base}-${n}`;
      return (await tx.category.create({ data: { kind: "INDUSTRY", name, slug }, select: { id: true } })).id;
    };
    for (const [name, focus, site, category] of DONORS) {
      const url = `https://${site}`;
      const org = await tx.organization.create({ data: { legalName: name, accountType: "FUNDING_PROVIDER", status: "ACTIVE", website: url, description: `UK donor organisation. Focus: ${focus}.` } });
      const provider = await tx.fundingProvider.create({ data: { organizationId: org.id, providerCategory: "UK donor", country: "United Kingdom" } });
      const base = slugify(name);
      await tx.contentItem.create({
        data: {
          contentType: "FUNDING_PROGRAMME",
          title: name,
          slug: usedSlugs.has(base) ? `${base}-fund` : base,
          shortSummary: focus,
          primaryCategoryId: await categoryId(category),
          overview: `${name} is a UK donor organisation that gives grants. Focus: ${focus}. Check its website for open calls, who can apply in Uganda, and how to apply.`,
          publicationStatus: "PUBLISHED",
          accessLevel: "PREVIEW",
          publishedAt: now,
          lastReviewedAt: now,
          fundingProgramme: {
            create: { providerId: provider.id, providerCategory: focus, fundingType: "GRANT", purpose: focus, officialTermsUrl: url, termsLastCheckedAt: now },
          },
        },
      });
    }
  }, { timeout: 60000 });

  const now = await prisma.contentItem.count({ where: { contentType: "FUNDING_PROGRAMME" } });
  console.log(`\nDone. Funding sources now: ${now}.`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());

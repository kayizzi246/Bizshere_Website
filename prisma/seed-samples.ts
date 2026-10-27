/**
 * SAMPLE directory content for development, following the client's field list
 * (Oct 2026). Every record says "Sample" so nobody mistakes it for researched data.
 *
 * Unlike the core seed, this file DOES fill prices and amounts, so the client can
 * see every field in use. They are placeholders: editors replace them in the admin.
 * The production seed (`npm run db:seed:production`) never runs this file.
 *
 * Safe to repeat: records are only created when missing, so admin edits are kept.
 */
import { Prisma, type PrismaClient } from "@prisma/client";

type Ctx = {
  prisma: PrismaClient;
  editorId: string;
  districts: Record<string, string>;
  now: Date;
  days: (n: number) => Date;
};

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const D = (n: number) => new Prisma.Decimal(n);
const SAMPLE_URL = "https://example.org/";

export async function seedSamples({ prisma, editorId, districts, now, days }: Ctx) {
  const cat = async (kind: Prisma.CategoryCreateInput["kind"], name: string) =>
    (await prisma.category.upsert({ where: { kind_slug: { kind, slug: slugify(name) } }, update: {}, create: { kind, name, slug: slugify(name) } })).id;

  const published = { publicationStatus: "PUBLISHED" as const, publishedAt: now, lastReviewedAt: now, createdById: editorId };
  /** Creates the content item and its record only if the slug is new. Returns null when it already existed. */
  async function create<T>(slug: string, item: Omit<Prisma.ContentItemUncheckedCreateInput, "slug">, record: (id: string) => Promise<T>) {
    if (await prisma.contentItem.findUnique({ where: { slug } })) return null;
    const ci = await prisma.contentItem.create({ data: { ...published, nextReviewDueAt: days(180), accessLevel: "PREVIEW", ...item, slug } });
    await record(ci.id);
    return ci;
  }
  async function org(legalName: string, accountType: Prisma.OrganizationCreateInput["accountType"]) {
    return (await prisma.organization.findFirst({ where: { legalName } })) ?? prisma.organization.create({ data: { legalName, accountType, status: "ACTIVE" } });
  }

  // ── 1. Business ideas ─────────────────────────────────────
  const agri = await cat("INDUSTRY", "Agriculture");
  const manuf = await cat("INDUSTRY", "Manufacturing");
  const food = await cat("INDUSTRY", "Food production");
  const ideas: [string, string, string, string, string, string, string, [string, string, number][]][] = [
    ["Sample: Maize milling", agri, "Agro-processing",
      "Buy maize from farmers, mill it into flour and sell to shops, schools and families.",
      "Sample description. A small mill turns dry maize grain into posho flour and bran. Bran can be sold as animal feed, so little is wasted.",
      "Three-phase power or a diesel engine\nA lockable store for grain\nA reliable supply of dry maize\nUNBS certification before selling packed flour",
      "Buying grain at harvest when prices are low\nKeeping the mill running most days\nGood packaging and a brand shops recognise",
      [["Equipment", "Hammer mill with motor", 6_500_000], ["Equipment", "Weighing scale", 450_000], ["Premises", "Rent, first 3 months", 1_800_000], ["Stock", "First maize stock", 3_000_000]]],
    ["Sample: Liquid soap making", manuf, "Manufacturing",
      "Make liquid soap and detergent in small batches for homes, offices and hotels.",
      "Sample description. Liquid soap needs little equipment and can start at home, then grow into a small factory with its own brand.",
      "Basic chemistry training and safety gear\nMixing drums and a weighing scale\nBottles and labels\nUNBS product certification",
      "Consistent quality from batch to batch\nCompetitive bottle prices\nSelling direct to institutions",
      [["Equipment", "Mixing tank and stirrer", 1_200_000], ["Stock", "Raw materials, first batches", 900_000], ["Packaging", "Bottles and labels", 600_000]]],
    ["Sample: Poultry (layers) farm", agri, "Farming",
      "Keep laying hens and sell eggs to shops, hotels and market traders.",
      "Sample description. A layers farm sells eggs every day once the birds start laying, at about 18–20 weeks.",
      "A well-ventilated poultry house\nDay-old chicks from a trusted hatchery\nFeed, water and vaccination schedule\nA plan for selling eggs every day",
      "Disease control and vaccination\nFeed cost control\nRegular buyers for eggs",
      [["Premises", "Poultry house construction", 8_000_000], ["Stock", "500 day-old chicks", 1_750_000], ["Stock", "Feed, first 2 months", 2_400_000]]],
  ];
  for (const [title, catId, businessType, brief, overview, keyRequirements, successFactors, lines] of ideas) {
    await create(slugify(title), { contentType: "BUSINESS_IDEA", title, shortSummary: brief, overview, primaryCategoryId: catId }, async (contentItemId) => {
      const idea = await prisma.businessIdea.create({ data: { contentItemId, businessType, keyRequirements, successFactors, remarks: "Sample remark: replace with notes from the research team." } });
      await prisma.budgetScenario.create({
        data: {
          ideaId: idea.id, level: "STANDARD", name: "Standard", locationId: districts.Kampala, estimateDate: now, assumptions: "Sample figures for layout only",
          lines: { create: lines.map(([costCategory, description, cost], n) => ({ costCategory, description, unitCost: D(cost), displayOrder: n })) },
        },
      });
      await prisma.ideaStep.createMany({ data: ["Research the market", "Register the business", "Set up premises and equipment", "Start small and grow"].map((t, n) => ({ ideaId: idea.id, stepNumber: n + 1, title: t, description: "Sample step. Replace with practical guidance." })) });
    });
  }
  await fill(prisma.businessIdea, "small-bakery", { businessType: "Food production", keyRequirements: "Premises with power and water\nAn oven and mixer\nFood handling permit", successFactors: "Fresh bread every morning\nRegular orders from shops and schools", remarks: "Sample remark: replace with notes from the research team." }, "businessType", prisma);

  // ── 2. Business machines ──────────────────────────────────
  const agroMach = await cat("MACHINE_CATEGORY", "Agro-processing machines");
  const packMach = await cat("MACHINE_CATEGORY", "Packaging machines");
  const machines: [string, string, string, string, string, number, number, string][] = [
    ["Sample: Hammer mill (maize)", agroMach, "Grinds dry maize and other grains into flour.", "Hammer mill", "Small to medium milling businesses.", 4_500_000, 8_000_000, "Kampala: machinery dealers on Kafumbe Mukasa Road (sample)\nOverseas: manufacturers in China and India (sample)"],
    ["Sample: Liquid soap mixer", manuf, "Mixes and heats liquid soap and detergent in batches.", "Mixing tank", "Small soap and detergent makers.", 1_000_000, 2_500_000, "Kampala: industrial equipment shops (sample)\nOverseas: suppliers in Kenya and China (sample)"],
    ["Sample: Band sealing machine", packMach, "Seals plastic and foil bags for flour, snacks and spices.", "Sealer", "Any business packing dry products in bags.", 1_800_000, 3_200_000, "Kampala: packaging suppliers (sample)\nOverseas: manufacturers in China (sample)"],
  ];
  for (const [title, catId, fn, type, brief, min, max, sources] of machines) {
    await create(slugify(title), { contentType: "MACHINE", title, shortSummary: brief, overview: `Sample description of the ${type.toLowerCase()}. Explain how it works, its capacity and what it needs to run.`, primaryCategoryId: catId }, (contentItemId) =>
      prisma.machine.create({ data: { contentItemId, function: fn, machineType: type, priceMin: D(min), priceMax: D(max), currency: "UGX", sources, remarks: "Sample remark: prices change; confirm with the seller before buying.", videoUrls: [SAMPLE_URL + "video"] } }));
  }
  await fill(prisma.machine, "deck-baking-oven-2-decks", { function: "Bakes bread, buns and pastries on two decks.", machineType: "Deck oven", priceMin: D(9_000_000), priceMax: D(15_000_000), sources: "Kampala: bakery equipment dealers (sample)\nOverseas: manufacturers in China and Turkey (sample)", remarks: "Sample remark: needs three-phase power.", videoUrls: [SAMPLE_URL + "video"] }, "machineType", prisma);

  // ── 3. Suppliers ──────────────────────────────────────────
  const inputsCat = await cat("PRODUCT_CATEGORY", "Agricultural inputs");
  const packCat = await cat("PRODUCT_CATEGORY", "Packaging materials");
  const suppliers: [string, string, "WHOLESALER" | "MANUFACTURER" | "IMPORTER", string, string[], string][] = [
    ["Sample Agro Inputs Ltd", inputsCat, "WHOLESALER", "Uganda", ["Seeds", "Fertiliser", "Animal feed", "Day-old chicks"], "Agricultural inputs for farmers and agro-dealers. (Sample record.)"],
    ["Sample Packaging Co.", packCat, "MANUFACTURER", "Kenya", ["Plastic bottles", "Printed labels", "Flour bags"], "Packaging for food and household products. (Sample record.)"],
    ["Sample Machinery Exports", agroMach, "IMPORTER", "China", ["Hammer mills", "Sealing machines", "Mixing tanks"], "Overseas machinery supplier shipping to Uganda. (Sample record.)"],
  ];
  for (const [title, catId, supplierType, country, items, brief] of suppliers) {
    const o = await org(title, "MACHINE_DEALER");
    if (await prisma.supplier.findUnique({ where: { organizationId: o.id } })) continue;
    await create(slugify(title), { contentType: "SUPPLIER", title, shortSummary: brief, primaryCategoryId: catId }, (contentItemId) =>
      prisma.supplier.create({ data: { contentItemId, organizationId: o.id, supplierType, country, items, email: "sales@example.com", phone: "+256 700 000 000", website: SAMPLE_URL } }));
  }
  await fill(prisma.supplier, "sample-bakery-equipment", { country: "Uganda", items: ["Deck ovens", "Dough mixers", "Bread slicers"], email: "sales@example.co.ug", phone: "+256 700 000 000", website: SAMPLE_URL }, "country", prisma);

  // ── 4. Funding sources ────────────────────────────────────
  const fundCat = await cat("INDUSTRY", "Finance");
  const funds: [string, string, string, "LOAN" | "GRANT" | "EQUITY", string, number, number, string[], string][] = [
    ["Sample: SME working capital loan", "Sample Commercial Bank", "Bank", "LOAN", "Short-term loans for stock and running costs.", 5_000_000, 50_000_000, ["Retail", "Manufacturing", "Services"], "Registered business operating for at least 12 months\nBank statements for 6 months\nTrading licence"],
    ["Sample: Youth enterprise grant", "Sample Government Youth Fund", "Government agency", "GRANT", "Grants for youth-led businesses with a clear plan.", 1_000_000, 10_000_000, ["Agriculture", "Manufacturing", "Technology"], "Applicants aged 18–35\nA written business plan\nRecommendation from the local council"],
    ["Sample: Agribusiness equity fund", "Sample Impact Investors", "Private", "EQUITY", "Equity investment for growing agro-processors.", 100_000_000, 500_000_000, ["Agro-processing"], "Operating for at least 2 years\nAudited accounts\nA plan to grow"],
  ];
  for (const [title, providerName, providerCategory, fundingType, brief, min, max, eligibleBusinessTypes, eligibilityText] of funds) {
    const o = await org(providerName, "FUNDING_PROVIDER");
    const provider = await prisma.fundingProvider.upsert({ where: { organizationId: o.id }, update: {}, create: { organizationId: o.id, providerCategory } });
    await create(slugify(title), { contentType: "FUNDING_PROGRAMME", title, shortSummary: brief, primaryCategoryId: fundCat }, (contentItemId) =>
      prisma.fundingProgramme.create({ data: { contentItemId, providerId: provider.id, fundingType, providerCategory, eligibilityText, amountMin: D(min), amountMax: D(max), currency: "UGX", eligibleBusinessTypes, officialTermsUrl: SAMPLE_URL } }));
  }
  await fill(prisma.fundingProgramme, "sample-sme-equipment-loan", { providerCategory: "Development fund", eligibilityText: "Registered small business\nQuotation for the equipment\nBusiness plan", amountMin: D(2_000_000), amountMax: D(30_000_000), eligibleBusinessTypes: ["Manufacturing", "Food production"], officialTermsUrl: SAMPLE_URL }, "providerCategory", prisma);

  // ── 5. Business information and guidelines ───────────────
  const guides: [string, string, string, string][] = [
    ["Sample: How to register for EFRIS", "Guideline", "Tax compliance", "Step-by-step guide to registering for the electronic invoicing system."],
    ["Sample: Starting a small business in Uganda", "Book", "Business planning", "A short book covering ideas, planning, registration and first sales."],
    ["Sample: Applying for an export licence", "Video", "Export licensing", "Video walkthrough of the export licence application."],
    ["Sample: Agro-processing investment opportunity", "Investment opportunity", "Investment", "Summary of a sample opportunity in an agro-processing zone."],
    ["Sample: Tax compliance checklist", "Form", "Tax compliance", "A checklist of the returns and deadlines a small business must meet."],
  ];
  for (const [title, resourceType, category, brief] of guides) {
    await create(slugify(title), { contentType: "GUIDE", title, shortSummary: brief, overview: `Sample description. ${brief} Replace with a summary of the real document.`, primaryCategoryId: await cat("GUIDE_PROCESS", category) }, (contentItemId) =>
      prisma.guide.create({ data: { contentItemId, resourceType, downloadUrl: SAMPLE_URL + "sample.pdf" } }));
  }
  await fill(prisma.guide, "how-to-register-a-business", { resourceType: "Guideline", downloadUrl: SAMPLE_URL + "sample.pdf" }, "downloadUrl", prisma);

  // ── 6. Business consultants and experts ──────────────────
  const experts: [string, string, string[], string, string][] = [
    ["Sample Tax Advisor", "Taxation and accounting", ["Taxation", "Accounting", "EFRIS"], "Kampala", "Helps small businesses file returns and keep books."],
    ["Sample Export Consultant", "Trade and export", ["Export", "Importation", "Customs"], "Wakiso", "Guides businesses through export licences and shipping."],
    ["Sample Coffee Processing Expert", "Agribusiness", ["Coffee processing", "Farming"], "Masaka", "Advises on coffee processing, quality and buyers."],
  ];
  for (const [fullName, category, specialties, district, brief] of experts) {
    await create(slugify(fullName), { contentType: "CONSULTANT", title: fullName, shortSummary: brief, overview: `Sample profile. ${fullName} has years of experience in ${specialties.join(", ").toLowerCase()}. Replace with the real profile.`, primaryCategoryId: await cat("SERVICE_SPECIALTY", category) }, (contentItemId) =>
      prisma.consultant.create({ data: { contentItemId, fullName, specialties, country: "Uganda", district, email: "expert@example.com", phone: "+256 700 000 000", website: SAMPLE_URL } }));
  }
  await fill(prisma.consultant, "sample-business-plan-consultant", { country: "Uganda", district: "Kampala", email: "consultant@example.co.ug", phone: "+256 700 000 000", website: SAMPLE_URL }, "country", prisma);
  const planning = await cat("SERVICE_SPECIALTY", "Business planning");
  await prisma.contentItem.updateMany({ where: { slug: "sample-business-plan-consultant", primaryCategoryId: null }, data: { primaryCategoryId: planning, overview: "Sample profile. Replace with the real profile." } });

  // ── 7. Cooking recipes (removed from the menu, page still works) ──
  await fill(prisma.recipe, "basic-white-bread-batch", { remarks: "Sample remark: quantities to be confirmed by a test bake.", videoUrl: SAMPLE_URL + "video" }, "remarks", prisma);

  // ── 8. Business tools ─────────────────────────────────────
  const tools: [string, "CALCULATOR" | "TEMPLATE", string, string][] = [
    ["Sample: VAT calculator", "CALCULATOR", "Tax calculators", "Work out VAT on a sale or purchase."],
    ["Sample: PAYE calculator", "CALCULATOR", "Tax calculators", "Work out PAYE on an employee's monthly pay."],
    ["Sample: Business plan template", "TEMPLATE", "Business planning templates", "A fill-in business plan for small businesses."],
    ["Sample: Cash flow template", "TEMPLATE", "Business planning templates", "Track money in and out month by month."],
  ];
  for (const [title, toolType, category, brief] of tools) {
    await create(slugify(title), { contentType: "TOOL", title, shortSummary: brief, overview: `Sample description. ${brief} Replace with how to use it and its limits.`, primaryCategoryId: await cat("TOOL_CATEGORY", category) }, (contentItemId) =>
      prisma.tool.create({ data: { contentItemId, toolType, downloadUrl: SAMPLE_URL + "sample.xlsx" } }));
  }
  await fill(prisma.tool, "batch-costing-template", { downloadUrl: SAMPLE_URL + "sample.xlsx" }, "downloadUrl", prisma);
  await prisma.contentItem.updateMany({ where: { slug: "batch-costing-template", overview: null }, data: { overview: "Sample description. Enter ingredient, packaging, energy and labour costs to get the cost of one batch." } });

  // ── 9. Markets and prices ─────────────────────────────────
  for (const [name, district] of [["Sample Jinja Central Market", "Jinja"], ["Sample Mbarara Main Market", "Mbarara"]] as const) {
    if (!(await prisma.market.findFirst({ where: { name } }))) await prisma.market.create({ data: { name, marketType: "Wholesale and retail", locationId: districts[district] } });
  }
  const markets = await prisma.market.findMany();
  const products: [string, string, string, number][] = [
    ["Rice", "Super", "50 kg bag", 210_000], ["Coffee", "Robusta FAQ", "kg", 9_500], ["Milk", "Fresh", "litre", 1_400], ["Maize grain", "Dry", "kg", 1_100],
  ];
  const produce = await cat("PRODUCT_CATEGORY", "Produce");
  for (const [name, variety, unit, base] of products) {
    const p = await prisma.product.upsert({ where: { name_variety_grade: { name, variety, grade: "Standard" } }, update: {}, create: { name, variety, grade: "Standard", standardUnit: unit, categoryId: produce } });
    if (await prisma.priceObservation.findFirst({ where: { productId: p.id } })) continue;
    await prisma.priceObservation.createMany({
      data: markets.map((m, n) => {
        const min = Math.round((base * (0.9 + n * 0.04)) / 100) * 100;
        return { marketId: m.id, productId: p.id, observedAt: days(-n - 1), collectedAt: now, priceType: "WHOLESALE" as const, priceMin: D(min), priceMax: D(Math.round(min * 1.12 / 100) * 100), currency: "UGX", quotedUnit: unit, notes: "Sample price: replace with a real observation", status: "PUBLISHED" as const, verificationResult: "NOT_CHECKED" as const };
      }),
    });
  }

  // ── 10. Useful websites ──────────────────────────────────
  const sites: [string, string, string, string, string][] = [
    ["Sample: Business registration portal", "Government portal", "Government services", "Register a company or business name online", "Free to use; you pay only the official fees."],
    ["Sample: Tax returns portal", "Government portal", "Government services", "File tax returns and pay taxes", "Needs a TIN and login."],
    ["Sample: Export market information", "Information site", "Trade and export", "Find export markets, rules and buyers", "Good for researching new markets."],
    ["Sample: Business finance comparison", "Comparison site", "Finance", "Compare loans and accounts from different banks", "Check terms with the bank before applying."],
  ];
  for (const [title, siteType, category, fn, remarks] of sites) {
    await create(slugify(title), { contentType: "WEBSITE", title, shortSummary: fn, accessLevel: "PUBLIC", primaryCategoryId: await cat("WEBSITE_CATEGORY", category) }, (contentItemId) =>
      prisma.usefulWebsite.create({ data: { contentItemId, canonicalUrl: SAMPLE_URL, siteType, mainFunction: fn, remarks } }));
  }
  await fill(prisma.usefulWebsite, "example-business-registration-portal", { siteType: "Government portal", remarks: "Sample remark: replace with the real portal." }, "remarks", prisma);

  // ── 11. Business news and updates ────────────────────────
  const news: [string, string, string][] = [
    ["Sample: New training programme for young entrepreneurs", "Education", "A sample training programme opens for applications next month."],
    ["Sample: Graduate internship opportunities announced", "Careers", "Sample internships in agribusiness and manufacturing."],
  ];
  for (const [title, category, standfirst] of news) {
    await create(slugify(title), { contentType: "NEWS", title, shortSummary: standfirst, accessLevel: "PUBLIC", nextReviewDueAt: days(30), primaryCategoryId: await cat("NEWS_CATEGORY", category) }, (contentItemId) =>
      prisma.newsArticle.create({ data: { contentItemId, articleType: "NEWS", publisher: "BizSphere-Ug", standfirst, body: "Sample body text. Replace with the full news story." } }));
  }
}

/**
 * Adds the client's new fields to an older sample record, once: only when `marker`
 * is still empty, so an admin's edits are never overwritten by a re-seed.
 */
async function fill(
  delegate: { updateMany(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<unknown> },
  slug: string,
  data: Record<string, unknown>,
  marker: string,
  prisma: PrismaClient,
) {
  const item = await prisma.contentItem.findUnique({ where: { slug }, select: { id: true } });
  if (!item) return;
  await delegate.updateMany({ where: { contentItemId: item.id, [marker]: null }, data });
}

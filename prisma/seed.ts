/**
 * Development seed data.
 *
 * Everything here is SAMPLE content so developers can click through the site.
 * No prices or amounts are invented: unknown money values are left empty with a
 * reason, as the blueprint requires. Replace with researched content before launch.
 */
import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedSamples } from "./seed-samples";

const prisma = new PrismaClient();
const now = new Date();
const days = (n: number) => new Date(now.getTime() + n * 86_400_000);

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@bizsphere.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "change-me-now";
  const demoPassword = process.env.SEED_DEMO_PASSWORD ?? "Demo-12345";
  // Production (`npm run db:seed:production`, or SEED_SAMPLE_DATA=false): admin +
  // reference data only. No demo accounts with known passwords, no sample listings.
  const sampleData = !process.argv.includes("--production") && process.env.SEED_SAMPLE_DATA !== "false";
  if (!sampleData && (adminPassword === "change-me-now" || adminPassword.length < 12)) {
    throw new Error("Production seed: set SEED_ADMIN_PASSWORD to a strong password (12+ characters).");
  }

  // ── Admin ────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { name: "Platform Admin", email: adminEmail, role: "ADMIN", passwordHash: await bcrypt.hash(adminPassword, 10) },
  });

  // ── Places ───────────────────────────────────────────────
  const uganda = await findOrCreateLocation("Uganda", "COUNTRY", null);
  const districts: Record<string, string> = {};
  for (const d of ["Kampala", "Wakiso", "Mukono", "Jinja", "Mbarara", "Gulu", "Mbale", "Arua", "Masaka", "Lira"]) {
    districts[d] = (await findOrCreateLocation(d, "DISTRICT", uganda.id)).id;
  }

  // ── Categories ───────────────────────────────────────────
  const cat = async (kind: Prisma.CategoryCreateInput["kind"], name: string) =>
    prisma.category.upsert({
      where: { kind_slug: { kind, slug: slugify(name) } },
      update: {},
      create: { kind, name, slug: slugify(name) },
    });
  const food = await cat("INDUSTRY", "Food production");
  await cat("INDUSTRY", "Food and drink");
  await cat("INDUSTRY", "Manufacturing");
  await cat("INDUSTRY", "Agriculture");
  const bakeryEq = await cat("MACHINE_CATEGORY", "Bakery equipment");
  const flourCat = await cat("PRODUCT_CATEGORY", "Flour and grains");
  const registration = await cat("GUIDE_PROCESS", "Registration");

  // ── Membership plans (prices NULL until the client confirms) ──
  const memberPlan = await prisma.membershipPlan.upsert({
    where: { code: "member" },
    update: {},
    create: {
      code: "member", name: "Member", audience: "MEMBER", sortOrder: 1,
      entitlements: { fullDetail: true, contacts: true, downloads: true, alerts: true, priceHistory: true },
    },
  });
  await prisma.membershipPlan.upsert({
    where: { code: "free" },
    update: {},
    create: { code: "free", name: "Free", audience: "MEMBER", sortOrder: 0, priceMonthly: 0, priceYearly: 0, entitlements: { fullDetail: false, save: true } },
  });
  for (const [code, name, order, ent] of [
    ["business_basic", "Basic listing", 10, { maxListings: 3, enquiries: false }],
    ["business_featured", "Featured", 11, { maxListings: null, enquiries: true, featured: true }],
    ["business_premium", "Premium", 12, { maxListings: null, enquiries: true, featured: true, homepage: true, statistics: true }],
  ] as const) {
    await prisma.membershipPlan.upsert({
      where: { code },
      update: {},
      create: { code, name, audience: "BUSINESS", sortOrder: order, entitlements: ent, ...(code === "business_basic" ? { priceMonthly: 0, priceYearly: 0 } : {}) },
    });
  }
  // ── Reference data: audiences and units ─────────────────
  for (const name of ["Youth", "Women entrepreneurs", "Farmers and agribusiness", "Students and graduates", "Diaspora investors", "Existing SMEs"]) {
    await prisma.audience.upsert({ where: { slug: slugify(name) }, update: {}, create: { name, slug: slugify(name) } });
  }
  // toBase only where the conversion is exact. Packaging units (bag, crate) have no fixed weight.
  const units: [string, string, string, string | null, number | null][] = [
    ["kg", "Kilogram", "mass", null, null], ["g", "Gram", "mass", "kg", 0.001], ["t", "Tonne", "mass", "kg", 1000],
    ["l", "Litre", "volume", null, null], ["ml", "Millilitre", "volume", "l", 0.001],
    ["piece", "Piece", "count", null, null], ["dozen", "Dozen", "count", "piece", 12],
    ["bag", "Bag (weight varies)", "count", null, null], ["crate", "Crate (size varies)", "count", null, null],
    ["kg_per_hour", "Kilograms per hour", "rate", null, null], ["l_per_hour", "Litres per hour", "rate", null, null],
    ["pieces_per_hour", "Pieces per hour", "rate", null, null], ["kw", "Kilowatt", "power", null, null],
    ["hour", "Hour", "time", null, null], ["day", "Day", "time", "hour", 24], ["month", "Month", "time", null, null],
  ];
  for (const [code, name, dimension, baseCode, toBase] of units) {
    await prisma.unit.upsert({ where: { code }, update: {}, create: { code, name, dimension, baseCode, toBase } });
  }
  const recipeCat = await cat("RECIPE_CATEGORY", "Baked goods");
  const toolCat = await cat("TOOL_CATEGORY", "Costing and pricing");
  const siteCat = await cat("WEBSITE_CATEGORY", "Government services");
  const newsCat = await cat("NEWS_CATEGORY", "Funding and finance");
  await cat("SERVICE_SPECIALTY", "Business planning");

  if (!sampleData) {
    await prisma.auditLog.create({ data: { actorId: admin.id, action: "seed.production", entityType: "system", details: { at: now.toISOString() } } });
    console.log("Production seed complete (admin + reference data, no sample content). Admin:", adminEmail);
    return;
  }

  // ── Demo accounts (development only) ────────────────────
  const editor = await prisma.user.upsert({
    where: { email: "editor@bizsphere.local" },
    update: {},
    create: { name: "Sample Editor", email: "editor@bizsphere.local", role: "EDITOR", passwordHash: await bcrypt.hash(demoPassword, 10) },
  });
  const member = await prisma.user.upsert({
    where: { email: "member@bizsphere.local" },
    update: {},
    create: { name: "Sample Member", email: "member@bizsphere.local", role: "USER", passwordHash: await bcrypt.hash(demoPassword, 10) },
  });
  const owner = await prisma.user.upsert({
    where: { email: "dealer@bizsphere.local" },
    update: {},
    create: { name: "Sample Dealer", email: "dealer@bizsphere.local", role: "CONTRIBUTOR", phone: "+256000000000", passwordHash: await bcrypt.hash(demoPassword, 10) },
  });
  await prisma.user.upsert({
    where: { email: "visitor@bizsphere.local" },
    update: {},
    create: { name: "Sample Visitor", email: "visitor@bizsphere.local", role: "USER", passwordHash: await bcrypt.hash(demoPassword, 10) },
  });

  // Give the sample member an active subscription
  const hasSub = await prisma.subscription.findFirst({ where: { userId: member.id } });
  if (!hasSub) {
    await prisma.subscription.create({ data: { userId: member.id, planId: memberPlan.id, status: "ACTIVE", currentPeriodEnd: days(30) } });
  }

  // ── Business idea: Small bakery ──────────────────────────
  const bakery = await upsertContent("small-bakery", {
    contentType: "BUSINESS_IDEA",
    title: "Small bakery",
    shortSummary: "Bake bread and pastries for nearby shops, schools and walk-in customers. (Sample record for development.)",
    overview: "Sample overview. Replace with researched content: market, premises, power needs and main costs.",
    primaryCategoryId: food.id,
    businessStages: ["IDEA", "STARTING"],
    publicationStatus: "PUBLISHED",
    accessLevel: "PREVIEW",
    publishedAt: now,
    lastReviewedAt: now,
    nextReviewDueAt: days(180),
    createdById: editor.id,
  });
  const idea = await prisma.businessIdea.upsert({
    where: { contentItemId: bakery.id },
    update: {},
    create: {
      contentItemId: bakery.id,
      experienceLevel: "BEGINNER",
      homeBasedSuitable: false,
      premisesRequirements: "Shop with 3-phase power, or a gas-fired oven",
      staffCount: null,
    },
  });
  const steps = [
    ["Confirm demand", "Visit nearby shops and schools and ask what bread they buy, how often and at what price."],
    ["Register and check permits", "Register the business name and check food handling requirements for your area."],
    ["Secure premises", "Find premises with suitable power, water and drainage for food production."],
    ["Buy and install equipment", "Buy the oven and mixer and arrange training from the supplier."],
    ["Test, cost and price", "Test recipes, cost each batch and set selling prices."],
  ];
  for (const [i, [title, description]] of steps.entries()) {
    await prisma.ideaStep.upsert({
      where: { ideaId_stepNumber: { ideaId: idea.id, stepNumber: i + 1 } },
      update: {},
      create: { ideaId: idea.id, stepNumber: i + 1, title, description },
    });
  }
  for (const level of ["LOW", "STANDARD", "HIGHER"] as const) {
    const existing = await prisma.budgetScenario.findUnique({ where: { ideaId_level: { ideaId: idea.id, level } } });
    if (existing) continue;
    await prisma.budgetScenario.create({
      data: {
        ideaId: idea.id,
        level,
        name: { LOW: "Low investment", STANDARD: "Standard", HIGHER: "Higher investment" }[level],
        locationId: districts.Kampala,
        assumptions: { LOW: "Used equipment, small premises", STANDARD: "New equipment, rented shop", HIGHER: "Larger oven, delivery vehicle" }[level],
        lines: {
          create: [
            ["Equipment", "Deck oven, 2 decks"],
            ["Equipment", "Spiral dough mixer"],
            ["Premises", "Rent, first months"],
            ["Stock", "First ingredient stock"],
            ["Registration", "Registration and permits"],
          ].map(([costCategory, description], i) => ({
            costCategory,
            description,
            unitCost: null,
            unknownReason: "Awaiting sourced quote",
            displayOrder: i,
          })),
        },
      },
    });
  }

  // ── Machine dealer organization + supplier + machine + offer ──
  let dealer = await prisma.organization.findFirst({ where: { legalName: "Sample Bakery Equipment Ltd" } });
  if (!dealer) {
    dealer = await prisma.organization.create({
      data: {
        legalName: "Sample Bakery Equipment Ltd",
        accountType: "MACHINE_DEALER",
        status: "ACTIVE",
        description: "Sample machine dealer for development.",
        members: { create: { userId: owner.id, role: "OWNER" } },
        locations: { create: { locationId: districts.Kampala, label: "Head office", physicalAddress: "[Street], Kampala", isPrimary: true } },
        contacts: { create: { personName: "Sample Contact", phone: "+256000000000", whatsapp: "+256000000000", email: "sales@example.co.ug", isPrimary: true } },
      },
    });
  }
  const supplierItem = await upsertContent("sample-bakery-equipment", {
    contentType: "SUPPLIER",
    title: "Sample Bakery Equipment Ltd",
    shortSummary: "Bakery ovens, mixers and installation. (Sample record.)",
    publicationStatus: "PUBLISHED",
    accessLevel: "PREVIEW",
    publishedAt: now,
    lastReviewedAt: now,
    nextReviewDueAt: days(365),
  });
  const supplier = await prisma.supplier.upsert({
    where: { organizationId: dealer.id },
    update: {},
    create: { contentItemId: supplierItem.id, organizationId: dealer.id, supplierType: "DISTRIBUTOR", offersInstallation: true, offersTraining: true, paymentMethods: ["Mobile money", "Bank transfer"] },
  });
  if (!(await prisma.verificationCheck.findFirst({ where: { contentItemId: supplierItem.id } }))) {
    await prisma.verificationCheck.create({
      data: { contentItemId: supplierItem.id, checkType: "BUSINESS_CONTACT", result: "PASSED", checkedById: editor.id, evidenceNotes: "Sample check", reviewDueAt: days(365) },
    });
  }

  const ovenItem = await upsertContent("deck-baking-oven-2-decks", {
    contentType: "MACHINE",
    title: "Deck baking oven, 2 decks",
    shortSummary: "Electric deck oven for bread, buns and pastries. (Sample record.)",
    primaryCategoryId: bakeryEq.id,
    publicationStatus: "PUBLISHED",
    accessLevel: "PREVIEW",
    publishedAt: now,
    lastReviewedAt: now,
    nextReviewDueAt: days(180),
  });
  const oven = await prisma.machine.upsert({
    where: { contentItemId: ovenItem.id },
    update: {},
    create: { contentItemId: ovenItem.id, powerSource: "Electric", voltage: 415, phase: 3, operatorsRequired: 1, capacityUnit: "loaves per hour", specifications: {} },
  });
  if (!(await prisma.supplierOffer.findFirst({ where: { machineId: oven.id, supplierId: supplier.id } }))) {
    await prisma.supplierOffer.create({
      data: { machineId: oven.id, supplierId: supplier.id, condition: "NEW", installationSupport: true, trainingSupport: true, status: "PUBLISHED" },
    });
  }
  await prisma.relatedContent.upsert({
    where: { fromItemId_toItemId_relationshipType: { fromItemId: bakery.id, toItemId: ovenItem.id, relationshipType: "needs_machine" } },
    update: {},
    create: { fromItemId: bakery.id, toItemId: ovenItem.id, relationshipType: "needs_machine" },
  });

  // ── Funding provider + programme + open round ────────────
  let funderOrg = await prisma.organization.findFirst({ where: { legalName: "Sample Development Fund" } });
  if (!funderOrg) {
    funderOrg = await prisma.organization.create({ data: { legalName: "Sample Development Fund", accountType: "FUNDING_PROVIDER", status: "ACTIVE" } });
  }
  const provider = await prisma.fundingProvider.upsert({
    where: { organizationId: funderOrg.id },
    update: {},
    create: { organizationId: funderOrg.id, providerCategory: "Development fund" },
  });
  const fundItem = await upsertContent("sample-sme-equipment-loan", {
    contentType: "FUNDING_PROGRAMME",
    title: "Sample SME equipment loan",
    shortSummary: "Loans for small businesses buying equipment. (Sample record; terms not real.)",
    publicationStatus: "PUBLISHED",
    accessLevel: "PREVIEW",
    publishedAt: now,
    lastReviewedAt: now,
    nextReviewDueAt: days(60),
  });
  const programme = await prisma.fundingProgramme.upsert({
    where: { contentItemId: fundItem.id },
    update: {},
    create: { contentItemId: fundItem.id, providerId: provider.id, fundingType: "LOAN", purpose: "Equipment and working capital", requiresRegistration: true },
  });
  if (!(await prisma.applicationRound.findFirst({ where: { programmeId: programme.id } }))) {
    await prisma.applicationRound.create({
      data: { programmeId: programme.id, status: "OPEN", opensAt: days(-10), closesAt: days(30), requiredDocuments: ["Certificate of registration", "Business plan", "Director ID"] },
    });
  }
  await prisma.relatedContent.upsert({
    where: { fromItemId_toItemId_relationshipType: { fromItemId: bakery.id, toItemId: fundItem.id, relationshipType: "fits_funding" } },
    update: {},
    create: { fromItemId: bakery.id, toItemId: fundItem.id, relationshipType: "fits_funding" },
  });

  // ── Guide ────────────────────────────────────────────────
  const guideItem = await upsertContent("how-to-register-a-business", {
    contentType: "GUIDE",
    title: "How to register a business in Uganda",
    shortSummary: "Steps to check with the official registration authority. (Sample record.)",
    primaryCategoryId: registration.id,
    publicationStatus: "PUBLISHED",
    accessLevel: "PUBLIC",
    publishedAt: now,
    lastReviewedAt: now,
    nextReviewDueAt: days(120),
  });
  await prisma.guide.upsert({ where: { contentItemId: guideItem.id }, update: {}, create: { contentItemId: guideItem.id, responsibleAuthority: "[Official authority]" } });

  // ── Markets + product (no observations: prices must come from real collection) ──
  const flour = await prisma.product.upsert({
    where: { name_variety_grade: { name: "Wheat flour", variety: "Baking", grade: "Grade 1" } },
    update: {},
    create: { name: "Wheat flour", variety: "Baking", grade: "Grade 1", categoryId: flourCat.id, standardUnit: "50 kg bag" },
  });
  for (const name of ["Owino Market", "Nakasero Market", "Kalerwe Market"]) {
    if (!(await prisma.market.findFirst({ where: { name } }))) {
      await prisma.market.create({ data: { name, marketType: "Wholesale and retail", locationId: districts.Kampala } });
    }
  }
  void flour;

  // ── Recipe (no prices: costing comes from real dated quotes) ──
  const recipeItem = await upsertContent("basic-white-bread-batch", {
    contentType: "RECIPE", title: "Basic white bread (batch)", primaryCategoryId: recipeCat.id,
    shortSummary: "A simple batch recipe for a small bakery. (Sample record; quantities not tested.)",
    publicationStatus: "PUBLISHED", accessLevel: "PREVIEW", publishedAt: now, lastReviewedAt: now, nextReviewDueAt: days(180), createdById: editor.id,
  });
  const recipe = await prisma.recipe.upsert({
    where: { contentItemId: recipeItem.id }, update: {},
    create: { contentItemId: recipeItem.id, skillLevel: "Beginner", equipment: "Spiral mixer, deck oven, loaf tins", yieldUnit: "loaves", allergens: ["Wheat (gluten)"], storage: "Cool, dry place in a closed container" },
  });
  if (!(await prisma.recipeStep.findFirst({ where: { recipeId: recipe.id } }))) {
    await prisma.recipeIngredient.createMany({
      // Quantities left empty until a test bake confirms them (unknown is not zero).
      data: [["Wheat flour", "kg"], ["Water", "l"], ["Yeast", "g"], ["Salt", "g"], ["Sugar", "g"]].map(([name, unit], n) => ({ recipeId: recipe.id, name, unit, quantity: null, order: n, prepNote: "quantity to be confirmed by test bake" })),
    });
    await prisma.recipeStep.createMany({
      data: ["Mix the dry ingredients.", "Add water and mix to a smooth dough.", "Prove until doubled in size.", "Shape, place in tins and prove again.", "Bake until golden and hollow-sounding."].map((instruction, n) => ({ recipeId: recipe.id, stepNumber: n + 1, instruction })),
    });
  }
  await link(bakery.id, recipeItem.id, "uses_recipe");

  // ── Tool ────────────────────────────────────────────────
  const toolItem = await upsertContent("batch-costing-template", {
    contentType: "TOOL", title: "Batch costing template", primaryCategoryId: toolCat.id,
    shortSummary: "Spreadsheet to cost a production batch and set a selling price. (Sample record.)",
    publicationStatus: "PUBLISHED", accessLevel: "PREVIEW", publishedAt: now, lastReviewedAt: now, nextReviewDueAt: days(365), createdById: editor.id,
  });
  const tool = await prisma.tool.upsert({
    where: { contentItemId: toolItem.id }, update: {},
    create: { contentItemId: toolItem.id, toolType: "TEMPLATE", purpose: "Work out what one batch costs and what each unit must sell for.", fileFormat: "XLSX", supportedSoftware: "Excel, LibreOffice, Google Sheets", editable: true, hasMacros: false, limitations: "Does not include tax. Enter your own current prices." },
  });
  await prisma.toolVersion.upsert({ where: { toolId_versionNumber: { toolId: tool.id, versionNumber: "1.0" } }, update: {}, create: { toolId: tool.id, versionNumber: "1.0", releasedAt: now, changeNotes: "First release" } });
  await link(bakery.id, toolItem.id, "uses_tool");

  // ── Useful website (example domain; replace with researched official sites) ──
  const siteItem = await upsertContent("example-business-registration-portal", {
    contentType: "WEBSITE", title: "Example business registration portal", primaryCategoryId: siteCat.id,
    shortSummary: "Placeholder showing how an official portal is described. (Sample record.)",
    publicationStatus: "PUBLISHED", accessLevel: "PUBLIC", publishedAt: now, lastReviewedAt: now, nextReviewDueAt: days(90), createdById: editor.id,
  });
  await prisma.usefulWebsite.upsert({
    where: { contentItemId: siteItem.id }, update: {},
    create: { contentItemId: siteItem.id, canonicalUrl: "https://example.org/", mainFunction: "Business registration", countries: ["Uganda"], languages: ["English"], accessCost: "FREE", officialSite: false, editorialAssessment: "Sample: explain what a business can do on the site and any limitations." },
  });
  await link(guideItem.id, siteItem.id, "hosted_on_website");

  // ── News ────────────────────────────────────────────────
  const newsItem = await upsertContent("sample-equipment-loan-round-opens", {
    contentType: "NEWS", title: "Sample: equipment loan round opens", primaryCategoryId: newsCat.id,
    shortSummary: "Shows how a news item links to the funding programme it concerns. (Sample record.)",
    publicationStatus: "PUBLISHED", accessLevel: "PUBLIC", publishedAt: now, lastReviewedAt: now, nextReviewDueAt: days(30), createdById: editor.id,
  });
  await prisma.newsArticle.upsert({
    where: { contentItemId: newsItem.id }, update: {},
    create: { contentItemId: newsItem.id, articleType: "NEWS", publisher: "BizSphere-Ug", standfirst: "A sample funding round is open for applications.", body: "Sample body text.", whatChanged: "A new application round opened.", whoAffected: "Registered small businesses buying equipment.", nextAction: "Check eligibility and prepare the listed documents." },
  });
  await link(newsItem.id, fundItem.id, "related_news");

  // ── Investment opportunity (promoter claims shown as claims) ──
  const oppItem = await upsertContent("sample-grain-milling-expansion", {
    contentType: "INVESTMENT_OPPORTUNITY", title: "Sample grain milling expansion",
    shortSummary: "Shows how an opportunity's terms, risks and promoter claims are presented. (Sample record; not a real offer.)",
    publicationStatus: "PUBLISHED", accessLevel: "PREVIEW", publishedAt: now, lastReviewedAt: now, nextReviewDueAt: days(60), createdById: editor.id,
  });
  await prisma.investmentOpportunity.upsert({
    where: { contentItemId: oppItem.id }, update: {},
    create: { contentItemId: oppItem.id, opportunityType: "Equity", promoter: "Sample promoter", sector: "Agro-processing", businessStage: "Operating", risks: "Sample: list the main risks the promoter discloses and any we identify.", claimVerificationStatus: "Not verified", requiredDocuments: ["Investor ID", "Proof of funds"] },
  });

  // ── Consultant ──────────────────────────────────────────
  const expertItem = await upsertContent("sample-business-plan-consultant", {
    contentType: "CONSULTANT", title: "Sample Consultant",
    shortSummary: "Helps small businesses write plans and loan applications. (Sample record.)",
    publicationStatus: "PUBLISHED", accessLevel: "PREVIEW", publishedAt: now, lastReviewedAt: now, nextReviewDueAt: days(365), createdById: editor.id,
  });
  const expert = await prisma.consultant.upsert({
    where: { contentItemId: expertItem.id }, update: {},
    create: { contentItemId: expertItem.id, fullName: "Sample Consultant", professionalTitle: "Business advisor", specialties: ["Business planning", "Loan applications"], languages: ["English", "Luganda"], deliveryModes: ["In person", "Online"], quotationRequired: true },
  });
  if (!(await prisma.consultantService.findFirst({ where: { consultantId: expert.id } }))) {
    await prisma.consultantService.create({ data: { consultantId: expert.id, name: "Business plan review", description: "Review of a draft plan before a loan application.", deliveryMode: "Online" } });
    await prisma.contact.create({ data: { consultantId: expert.id, personName: "Sample Consultant", email: "consultant@example.co.ug", isPrimary: true } });
  }
  await link(bakery.id, expertItem.id, "expert_help");

  // ── A pending business application for the review queue ──
  const pending = await prisma.submission.findFirst({ where: { type: "NEW_BUSINESS", organizationId: dealer.id } });
  if (!pending) {
    await prisma.submission.create({
      data: { type: "NEW_BUSINESS", organizationId: dealer.id, submittedById: owner.id, payload: { note: "Sample application" } },
    });
  }

  // ── Sample content for every directory, following the client's field list ──
  await seedSamples({ prisma, editorId: editor.id, districts, now, days });

  // ── Homepage updates marquee (only if none exist, so admin edits are kept) ──
  if ((await prisma.siteUpdate.count()) === 0) {
    await prisma.siteUpdate.createMany({
      data: [
        { message: "Sample: a new SME equipment loan round is open", href: "/funding/sample-sme-equipment-loan", sortOrder: 1 },
        { message: "Sample: market prices are updated as new observations come in", href: "/prices", sortOrder: 2 },
        { message: "Sample: want your business listed? Contact our team", href: "/contact", sortOrder: 3 },
      ],
    });
  }

  await prisma.auditLog.create({ data: { actorId: admin.id, action: "seed", entityType: "system", details: { at: now.toISOString() } } });
  console.log("Seed complete. Admin:", adminEmail);
}

async function findOrCreateLocation(name: string, type: "COUNTRY" | "DISTRICT", parentId: string | null) {
  const found = await prisma.location.findFirst({ where: { name, type, parentId } });
  return found ?? prisma.location.create({ data: { name, type, parentId } });
}

async function link(fromItemId: string, toItemId: string, relationshipType: string) {
  await prisma.relatedContent.upsert({
    where: { fromItemId_toItemId_relationshipType: { fromItemId, toItemId, relationshipType } },
    update: {},
    create: { fromItemId, toItemId, relationshipType },
  });
}

async function upsertContent(slug: string, data: Omit<Prisma.ContentItemUncheckedCreateInput, "slug">) {
  return prisma.contentItem.upsert({ where: { slug }, update: {}, create: { ...data, slug } });
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

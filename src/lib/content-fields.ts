import type { ContentType } from "@prisma/client";

/**
 * Admin entry-form definitions, one per directory (blueprint sections 04–13).
 * The admin form (src/app/admin/content/ContentForm.tsx) and the save action
 * (src/app/admin/content/actions.ts) are both driven by this file, so adding a
 * column means: add it to schema.prisma, migrate, then add one line here.
 *
 * `name` must match the Prisma field on the specialised model exactly.
 */
export type FieldKind = "text" | "textarea" | "int" | "decimal" | "bool" | "date" | "list" | "enum" | "url" | "json" | "images";
/** `upload` adds an "Upload" button that stores the file and fills in its address. */
export type Field = {
  name: string; label: string; kind: FieldKind; options?: string[]; help?: string; required?: boolean; group?: string; upload?: "image" | "file";
  /** Filled in on a new page. */
  initial?: string;
  /** Not a column of the directory's own table: saved by hand in src/app/admin/content/actions.ts. */
  virtual?: boolean;
  /** A choice of an existing record (the id is stored), listed in src/app/admin/content/load.ts. */
  ref?: "supplier";
  /** Render this field in the Basics section, right after the category (e.g. supplier "Business type"). */
  basics?: boolean;
  /** For kind "images": the array column that holds the extra photos (the main one stays in `name`). */
  extra?: string;
};

/** Child rows edited as one line each in a textarea. */
export type ChildList = { key: "ideaSteps" | "guideSteps" | "recipeSteps" | "recipeIngredients" | "guideDocuments"; label: string; help: string };

export type Directory = {
  type: ContentType;
  label: string;
  model: "businessIdea" | "machine" | "supplier" | "fundingProgramme" | "investmentOpportunity" | "guide" | "consultant" | "recipe" | "tool" | "website" | "news" | "businessTip";
  /** Extra required link chosen in the form. */
  link?: { field: "organizationId" | "providerId"; label: string; /** Rarely needed: kept under Advanced settings, with this explanation. */ advanced?: string };
  /** Form labels for the shared fields, in the client's wording (e.g. "Machine name", "Brief"). */
  labels?: { title?: string; shortSummary?: string; overview?: string; category?: string; main?: string; mainNote?: string; moreNote?: string };
  /** Leave out the short-summary field entirely (client, 14 Nov 2026: suppliers keep only the business description). */
  hideShortSummary?: boolean;
  /** Hide the "Advanced settings" fold to keep the form simple (client, 14 Nov 2026). */
  simpleForm?: boolean;
  fields: Field[];
  children?: ChildList[];
};

/** The client's field list for each directory. Shown first in the form and on the public page. */
export const MAIN = "Main details";

const t = (name: string, label: string, group?: string, help?: string): Field => ({ name, label, kind: "text", group, help });
const ta = (name: string, label: string, group?: string, help?: string): Field => ({ name, label, kind: "textarea", group, help });
const b = (name: string, label: string, group?: string): Field => ({ name, label, kind: "bool", group });
const i = (name: string, label: string, group?: string, help?: string): Field => ({ name, label, kind: "int", group, help });
const d = (name: string, label: string, group?: string, help?: string): Field => ({ name, label, kind: "decimal", group, help });
const dt = (name: string, label: string, group?: string): Field => ({ name, label, kind: "date", group });
const l = (name: string, label: string, group?: string): Field => ({ name, label, kind: "list", group, help: "Comma-separated" });
const u = (name: string, label: string, group?: string): Field => ({ name, label, kind: "url", group });
const e = (name: string, label: string, options: string[], group?: string): Field => ({ name, label, kind: "enum", options, group });
const cur = (group?: string): Field => ({ name: "currency", label: "Currency", kind: "text", group, help: "e.g. UGX or USD" });

const MONEY_HELP = "Leave empty if unknown. Don't enter 0 unless it really is zero.";
/** The funder's details on a funding source. */
export const FUNDER = "Funder details";
/** Who sells a machine: a supplier on the site, or a name and contacts typed in. Always open in the form. */
export const PROVIDER = "Provider (where to buy)";
/** The provider fields, shown in "Where to buy" on the machine page rather than in the specifications. */
export const PROVIDER_FIELDS = ["supplierId", "providerName", "providerPhone", "providerEmail", "providerWebsite"];

export const DIRECTORIES: Directory[] = [
  {
    type: "BUSINESS_IDEA", label: "Business idea", model: "businessIdea",
    labels: { title: "Business idea name", shortSummary: "Brief", overview: "Business description", category: "Business category" },
    // Main details follow the client's business idea template (rows 1–13); row 14, the start-up
    // budget, is edited under "Startup budget scenarios".
    fields: [
      e("businessSize", "Business size", ["SMALL", "MEDIUM", "LARGE"], MAIN),
      t("businessType", "Business type", MAIN, "e.g. Retail business, Manufacturing, Service"),
      ta("keyRequirements", "Key requirements", MAIN, "One per line, e.g. Space, Fridges, Shelves"),
      ta("locationRequirements", "Best location", MAIN, "One per line, e.g. Residential area"), ta("locationNotes", "Best location: notes", MAIN, "e.g. Parking area is key"),
      d("capitalMin", "Starting capital from", MAIN, MONEY_HELP), d("capitalMax", "Starting capital to", MAIN, MONEY_HELP), cur(MAIN),
      ta("capitalNotes", "Starting capital: notes", MAIN, "e.g. Depends on the amount of stock and kind of equipment bought"),
      ta("licencesToInvestigate", "Special requirements", MAIN, "Licences and registrations, one per line, e.g. Trading licence"),
      ta("targetCustomers", "Target market", MAIN), ta("successFactors", "Success factors", MAIN),
      e("profitPotential", "Profit potential", ["LOW", "MEDIUM", "HIGH"], MAIN),
      ta("requiredSkills", "Key skills", MAIN, "One per line, e.g. Business management"), t("setupTime", "Time to set up", MAIN, "e.g. 2 – 3 weeks"),
      ta("remarks", "Remarks", MAIN),
      { ...u("pictureUrl", "Picture", MAIN), upload: "image" }, t("pictureCredit", "Picture credit", MAIN, "e.g. Photo: Jane Doe, CC BY-SA 4.0"),
      ta("businessModel", "Business model", "Concept"), ta("productsOrServices", "Products or services", "Concept"),
      ta("customerProblem", "Customer problem", "Concept"), ta("valueProposition", "Value proposition", "Concept"),
      e("experienceLevel", "Experience level", ["BEGINNER", "INTERMEDIATE", "ADVANCED"], "Suitability"),
      t("ownerTimeCommitment", "Owner time commitment", "Suitability"), b("homeBasedSuitable", "Can be home-based", "Suitability"),
      ta("demandEvidence", "Demand evidence", "Market"),
      ta("competitorNotes", "Competitors", "Market"), ta("salesChannels", "Sales channels", "Market"), t("seasonality", "Seasonality", "Market"),
      ta("premisesRequirements", "Premises", "Implementation"), ta("staffingRequirements", "Staffing", "Implementation"),
      i("staffCount", "Staff count", "Implementation"),
      ta("operatingCosts", "Operating costs", "Operating economics"), ta("sellingPriceAssumption", "Selling-price assumptions", "Operating economics"),
      ta("salesVolumeAssumption", "Sales-volume assumptions", "Operating economics"), ta("workingCapitalNotes", "Working capital", "Operating economics"),
      ta("majorRisks", "Major risks", "Assessment"),
      ta("riskReductionActions", "Risk reduction", "Assessment"), ta("growthOptions", "Growth options", "Assessment"),
    ],
    children: [{ key: "ideaSteps", label: "Startup steps", help: "One step per line: Title | description" }],
  },
  {
    type: "MACHINE", label: "Business machine", model: "machine",
    labels: { title: "Machine name", shortSummary: "Brief", overview: "Description", category: "Category" },
    fields: [
      ta("function", "Function", MAIN), t("machineType", "Type", MAIN),
      d("priceMin", "Price from", MAIN, MONEY_HELP), d("priceMax", "Price to", MAIN, "Same as the first box for a single price"), cur(MAIN),
      ta("sources", "Source", MAIN, "Where to buy it, in Uganda and overseas"),
      { name: "pictureUrl", label: "Pictures (add several; the first is the main one)", kind: "images", group: MAIN, extra: "moreImages" },
      t("pictureCredit", "Picture credit", MAIN, "e.g. Photo: Jane Doe, CC BY-SA 4.0"),
      l("videoUrls", "Videos (links)", MAIN), ta("remarks", "Remarks", MAIN),
      { name: "supplierId", label: "Supplier already on the site", kind: "text", group: PROVIDER, ref: "supplier", help: "Choose one to link their page and use their contacts. Leave on \"None\" to type the provider below." },
      t("providerName", "Provider name", PROVIDER, "Not needed when you chose a supplier above"),
      t("providerPhone", "Provider phone", PROVIDER, "e.g. 0772 123 456"), t("providerEmail", "Provider email", PROVIDER),
      { ...u("providerWebsite", "Provider website", PROVIDER), help: "e.g. www.example.com" },
      t("manufacturer", "Manufacturer", "Identity"), t("brand", "Brand", "Identity"), t("modelNumber", "Model number", "Identity"),
      t("materialsProcessed", "Materials processed", "Applications"), t("productsProduced", "Products produced", "Applications"),
      d("capacityMin", "Capacity min", "Performance"), d("capacityMax", "Capacity max", "Performance"), t("capacityUnit", "Capacity unit", "Performance", "Use a unit code, e.g. kg_per_hour"),
      t("capacityBasis", "Capacity basis", "Performance"), t("automationLevel", "Automation level", "Performance"), i("operatorsRequired", "Operators required", "Performance"),
      t("powerSource", "Power source", "Installation"), d("ratedPowerKw", "Rated power (kW)", "Installation"), i("voltage", "Voltage (V)", "Installation"), i("phase", "Phase", "Installation"),
      t("dimensions", "Dimensions", "Installation"), d("weightKg", "Weight (kg)", "Installation"), ta("spaceRequirements", "Space requirements", "Installation"), ta("installationRequirements", "Installation requirements", "Installation"),
      ta("consumables", "Consumables", "Operation"), ta("maintenance", "Maintenance", "Operation"), ta("sparePartsNotes", "Spare parts", "Operation"),
      ta("trainingRequirements", "Training", "Operation"), ta("safetyInstructions", "Safety", "Operation"),
      { name: "specifications", label: "Category-specific specifications (JSON)", kind: "json", group: "Specifications", help: 'e.g. {"decks": 2, "trays_per_deck": 4}' },
    ],
  },
  {
    type: "SUPPLIER", label: "Trusted supplier", model: "supplier",
    link: { field: "organizationId", label: "Business account", advanced: "Only for a business that already has an account on the site. Otherwise leave this alone: one is made for you." },
    hideShortSummary: true, simpleForm: true,
    labels: {
      title: "Business name", shortSummary: "Short description (optional)", overview: "Business description", category: "Business category",
      main: "Address", mainNote: "Shown on the supplier's page. Call and WhatsApp are shown to members only. You add their products after saving.", moreNote: "Optional. Buyers can filter the suppliers list by these.",
    },
    // The client's field list (14 Nov 2026): business name, description and category (Basics), then the
    // address: contact person, location, website, WhatsApp, call. The rest after it. Products are added after saving.
    fields: [
      t("contactPerson", "Contact person name", MAIN, "e.g. John Okello"),
      { ...t("address", "Address / location", MAIN, "Street, building or area, e.g. Shop 12, Kikuubo Lane, Kampala"), virtual: true },
      { ...u("website", "Website", MAIN), help: "e.g. www.example.com" },
      t("whatsapp", "WhatsApp number", MAIN, "e.g. 0772 123 456. Leave empty if it is the same as the call number"),
      t("phone", "Call contact", MAIN, "e.g. 0772 123 456"),
      t("email", "Email address", MAIN),
      { ...l("items", "What they sell", MAIN), help: "Separate with commas, e.g. flour, ovens, packaging" },
      { ...u("pictureUrl", "Photo (shop front, products or logo)", MAIN), upload: "image" },
      { ...t("country", "Country", MAIN), initial: "Uganda" },
      { ...e("supplierType", "Business type", ["MANUFACTURER", "DISTRIBUTOR", "WHOLESALER", "RETAILER", "IMPORTER", "SERVICE_PROVIDER"], MAIN), basics: true },
    ],
  },
  {
    type: "FUNDING_PROGRAMME", label: "Funding source", model: "fundingProgramme",
    link: { field: "providerId", label: "Fund provider" },
    labels: { title: "Fund name", shortSummary: "Brief", overview: "Description (optional)", category: "Category" },
    fields: [
      // In the order of the client's funding template (Nov 2026): the list's columns, then the fund details' rows
      { ...e("fundingType", "Fund type", ["LOAN", "GRANT", "EQUITY", "GUARANTEE", "OTHER"], MAIN), required: true },
      t("purpose", "Purpose", MAIN, "e.g. Working capital, Education, Women empowerment"),
      d("amountMin", "Amount given, from", MAIN, MONEY_HELP), d("amountMax", "Amount given, up to", MAIN, "A ceiling, not a guarantee"), cur(MAIN),
      t("amountBasis", "Amount note", MAIN, "e.g. 10m to 20m for beginners, 200m for repeat customers"),
      ta("eligibilityText", "Eligibility", MAIN, "One requirement per line"),
      b("collateralRequired", "Collateral required", MAIN),
      t("targetGroup", "Target group", MAIN, "e.g. SMEs, Women, Youth"),
      t("tenor", "Tenor", MAIN, "e.g. 4 months to 24 months"),
      l("eligibleBusinessTypes", "Eligible sectors", MAIN),
      ta("howToApply", "How to apply", MAIN, "e.g. SMS MAALI to 8979, or fill in the form on their website"),
      u("officialTermsUrl", "Apply link", MAIN),
      t("providerCategory", "Provider category", MAIN, "e.g. Bank, Government agency, Private"),
      // The funder's own details, kept on the fund provider and shared by all its funds (saved in src/app/admin/content/actions.ts)
      { ...t("funderPhone", "Phone", FUNDER, "e.g. 0772 547 273, 0701 547 273"), virtual: true },
      { ...t("funderEmail", "Email", FUNDER), virtual: true },
      { ...u("funderWebsite", "Website", FUNDER), virtual: true },
      { ...t("funderCountry", "Country", FUNDER, "Uganda if left empty"), virtual: true },
      { ...u("funderLogo", "Photo or logo", FUNDER), upload: "image", virtual: true },
      b("requiresRegistration", "Registration required", "Eligibility"),
      i("minOperatingMonths", "Minimum months operating", "Eligibility"), d("minAnnualTurnover", "Minimum annual turnover", "Eligibility", MONEY_HELP), ta("applicantRequirements", "Applicant requirements", "Eligibility"),
      t("matchingContribution", "Matching contribution", "Amount"),
      d("interestRate", "Interest rate (%)", "Loan terms"), t("rateBasis", "Rate basis", "Loan terms", "e.g. per year, flat"), e("rateType", "Rate type", ["FIXED", "VARIABLE"], "Loan terms"),
      ta("fees", "Fees", "Loan terms"), i("repaymentMonths", "Repayment period (months)", "Loan terms"), t("repaymentFrequency", "Repayment frequency", "Loan terms"),
      i("gracePeriodMonths", "Grace period (months)", "Loan terms"), b("guarantorRequired", "Guarantor required", "Loan terms"),
      ta("eligibleExpenses", "Eligible expenses", "Grant terms"), ta("milestones", "Milestones", "Grant terms"), ta("reportingRequirements", "Reporting", "Grant terms"), ta("restrictions", "Restrictions", "Grant terms"),
      t("investmentInstrument", "Investment instrument", "Equity terms"), ta("ownershipTerms", "Ownership terms", "Equity terms"), ta("governanceTerms", "Governance", "Equity terms"), ta("selectionCriteria", "Selection criteria", "Equity terms"),
      dt("termsVersionDate", "Terms version date", "Evidence"), dt("termsLastCheckedAt", "Terms last checked", "Evidence"),
    ],
  },
  {
    type: "INVESTMENT_OPPORTUNITY", label: "Investment opportunity", model: "investmentOpportunity",
    fields: [
      t("opportunityType", "Type", "Opportunity"), t("promoter", "Promoter", "Opportunity"), t("sector", "Sector", "Opportunity"), ta("projectDescription", "Project description", "Opportunity"),
      d("capitalSought", "Capital sought", "Capital", MONEY_HELP), cur("Capital"), d("minimumParticipation", "Minimum participation", "Capital", MONEY_HELP), ta("useOfFunds", "Use of funds", "Capital"),
      ta("investmentStructure", "Investment structure", "Terms"), ta("investorRights", "Investor rights", "Terms"), ta("revenueModel", "Revenue model", "Terms"), t("term", "Term", "Terms"), ta("exitArrangements", "Exit arrangements", "Terms"),
      t("businessStage", "Business stage", "Assessment"), ta("financialEvidence", "Financial evidence available", "Assessment"), ta("assumptions", "Assumptions", "Assessment"),
      ta("risks", "Risks", "Assessment"), ta("independentEvidence", "Independent evidence", "Assessment"),
      dt("opensAt", "Opens", "Application"), dt("deadline", "Deadline", "Application"), ta("applicationProcess", "Process", "Application"), l("requiredDocuments", "Required documents", "Application"), ta("contactNotes", "Contact", "Application"),
      ta("promoterReturnClaim", "Promoter's return claim (shown as a claim)", "Claims"), ta("calculationBasis", "Calculation basis", "Claims"), t("claimVerificationStatus", "Claim verification status", "Claims"),
    ],
  },
  {
    type: "GUIDE", label: "Business guide", model: "guide",
    labels: { title: "Title", shortSummary: "Brief (optional)", overview: "Description", category: "Category" },
    fields: [
      t("resourceType", "Doc type", MAIN, "e.g. Guideline, Book, Video, Website, Investment opportunity, Form"),
      { ...u("downloadUrl", "Download file", MAIN), upload: "file" },
      t("jurisdiction", "Jurisdiction", "Identity"), t("responsibleAuthority", "Responsible authority", "Identity"),
      ta("purpose", "Purpose", "Procedure"), ta("prerequisites", "Prerequisites", "Procedure"), t("submissionChannel", "Submission channel", "Procedure"), ta("expectedOutcome", "Expected outcome", "Procedure"),
      t("issuingBody", "Issuing body", "Authority and dates"), dt("publicationDate", "Publication date", "Authority and dates"), dt("effectiveDate", "Effective date", "Authority and dates"),
      t("version", "Version", "Authority and dates"), b("superseded", "Superseded", "Authority and dates"),
      u("officialUrl", "Official URL", "Access"), u("videoUrl", "Video URL", "Access"), t("language", "Language", "Access"),
      ta("practicalNotes", "BizSphere practical notes (kept apart from official text)", "Editorial"), ta("commonMistakes", "Common mistakes", "Editorial"),
    ],
    children: [
      { key: "guideSteps", label: "Steps", help: "One step per line. Start a line with * for a BizSphere tip rather than an official step." },
      { key: "guideDocuments", label: "Required documents", help: "One document per line: Name | notes" },
    ],
  },
  {
    type: "CONSULTANT", label: "Business expert", model: "consultant",
    // Business-oriented (client, 14 Nov 2026): business name, category and description (Basics), then the
    // services, contact person and address together. The title holds the business name.
    hideShortSummary: true,
    labels: {
      title: "Business name", shortSummary: "Short description (optional)", overview: "Business description", category: "Business category",
      main: "Services, contact person and address", mainNote: "Shown on the expert's page. Phone and email are shown to members only.", moreNote: "Optional. Fill in what you know.",
    },
    fields: [
      { ...l("specialties", "Services offered", MAIN), help: "Separate with commas, e.g. tax, accounting, export" },
      t("fullName", "Contact person name", MAIN, "The person buyers will talk to"),
      t("professionalTitle", "Job title", MAIN, "e.g. Accountant, Tax consultant"),
      t("phone", "Phone number", MAIN, "e.g. 0772 123 456"), t("email", "Email address", MAIN),
      { ...u("photoUrl", "Photo", MAIN), upload: "image" },
      t("address", "Physical address", MAIN, "Street, building or area, e.g. Plot 12, Kampala Road, 2nd floor"),
      t("district", "District", MAIN, "e.g. Kampala"), { ...t("country", "Country", MAIN), initial: "Uganda" },
      { ...u("website", "Website", MAIN), help: "e.g. www.example.com" },
      l("languages", "Languages", "Experience and languages"), { ...l("deliveryModes", "How they work", "Experience and languages"), help: "Separate with commas, e.g. in person, online" }, ta("experience", "Experience", "Experience and languages"),
      { ...u("profileUrl", "Profile to download (CV or company profile)", "Experience and languages"), upload: "file" },
      d("feeMin", "Fee from", "Fees", MONEY_HELP), d("feeMax", "Fee to", "Fees", MONEY_HELP), cur("Fees"), t("pricingBasis", "Charged", "Fees", "per hour, per day, per project"),
      i("consultationMins", "Consultation length (minutes)", "Fees"), b("quotationRequired", "Gives a quote first", "Fees"),
      t("availability", "When they are available", "Availability"), t("responseTime", "How fast they reply", "Availability"), u("bookingUrl", "Booking or enquiry link", "Availability"),
    ],
  },
  {
    type: "RECIPE", label: "Recipe", model: "recipe",
    labels: { title: "Recipe name", shortSummary: "Brief (optional)", overview: "Description (optional)", category: "Category" },
    fields: [
      u("videoUrl", "Video link", MAIN), ta("remarks", "Remark", MAIN),
      t("cuisine", "Cuisine", "Recipe"), t("skillLevel", "Skill level", "Recipe"), ta("equipment", "Equipment", "Recipe"),
      d("yieldQuantity", "Yield quantity", "Yield and time"), t("yieldUnit", "Yield unit", "Yield and time"), i("servings", "Servings", "Yield and time"),
      i("prepMinutes", "Preparation (min)", "Yield and time"), i("cookMinutes", "Cooking (min)", "Yield and time"),
      l("allergens", "Allergens", "Food information"), l("dietaryLabels", "Dietary labels", "Food information"), ta("storage", "Storage", "Food information"),
      t("shelfLife", "Shelf life", "Food information"), ta("shelfLifeEvidence", "Shelf-life evidence (required for shelf life to show)", "Food information"),
      i("videoDurationSec", "Video length (s)", "Media"), ta("transcript", "Transcript", "Media"),
    ],
    children: [
      { key: "recipeIngredients", label: "Ingredients", help: "One per line: quantity | unit | name | preparation note | substitute. Leave quantity empty if unknown or 'to taste'." },
      { key: "recipeSteps", label: "Method", help: "One step per line. Optional: instruction | minutes | °C" },
    ],
  },
  {
    type: "TOOL", label: "Business tool", model: "tool",
    labels: { title: "Tool name", shortSummary: "Brief (optional)", overview: "Description", category: "Category" },
    fields: [
      { ...e("toolType", "Tool type", ["TEMPLATE", "CALCULATOR", "CHECKLIST"], MAIN), required: true }, { ...u("downloadUrl", "Download file", MAIN), upload: "file" },
      ta("purpose", "Purpose", "Identity"), t("intendedUser", "Intended user", "Identity"),
      ta("requiredInputs", "Required inputs", "Instructions"), ta("usageSteps", "Usage steps", "Instructions"), ta("workedExample", "Worked example", "Instructions"), ta("limitations", "Limitations", "Instructions"),
      t("fileFormat", "File format", "Compatibility"), t("supportedSoftware", "Supported software", "Compatibility"), b("editable", "Editable", "Compatibility"), b("hasMacros", "Contains macros", "Compatibility"),
      t("calculatorRoute", "Calculator route", "Access", "e.g. /tools/calc/paye"), t("licence", "Licence", "Access"), t("publisher", "Publisher", "Access"),
      t("jurisdiction", "Jurisdiction", "Jurisdiction"), dt("effectiveDate", "Rules effective date", "Jurisdiction"), u("ruleSourceUrl", "Official rule source", "Jurisdiction"),
    ],
  },
  {
    type: "WEBSITE", label: "Useful website", model: "website",
    labels: { title: "Site name", shortSummary: "Brief (optional)", overview: "Description (optional)", category: "Category" },
    fields: [
      { name: "canonicalUrl", label: "Link", kind: "url", required: true, group: MAIN }, t("siteType", "Type", MAIN), t("mainFunction", "Function", MAIN), ta("remarks", "Remark", MAIN),
      t("operator", "Operated by", "Identity"), ta("resources", "Resources available", "Classification"), ta("useCase", "Business use case", "Classification"),
      l("countries", "Countries served", "Coverage"), l("languages", "Languages", "Coverage"),
      e("accessCost", "Cost", ["FREE", "PAID", "FREEMIUM"], "Access"), u("pricingUrl", "Pricing URL", "Access"), b("accountRequired", "Account required", "Access"), ta("restrictions", "Restrictions", "Access"),
      b("officialSite", "Official site", "Trust"), ta("ownershipEvidence", "Ownership evidence", "Trust"), ta("editorialAssessment", "Editorial assessment", "Trust"),
      dt("lastContentReviewAt", "Content last reviewed", "Trust"), t("availabilityStatus", "Availability status", "Trust"),
      b("isAffiliate", "Affiliate link", "Commercial"), ta("disclosure", "Disclosure text", "Commercial"),
    ],
  },
  {
    type: "NEWS", label: "Business news", model: "news",
    fields: [
      e("articleType", "Type", ["NEWS", "REPORT", "ANALYSIS", "OPINION"], "Article"), ta("standfirst", "Standfirst", "Article"), { name: "body", label: "Body", kind: "textarea", group: "Article" },
      t("author", "Author", "Attribution"), t("publisher", "Publisher", "Attribution"), u("originalUrl", "Original URL", "Attribution"), l("sourceLinks", "Source links", "Attribution"), t("imageCredit", "Image credit", "Attribution"),
      dt("eventDate", "Event date", "Dates"), dt("effectiveDate", "Takes effect", "Dates"),
      ta("whatChanged", "What changed", "Practical value"), ta("whoAffected", "Who is affected", "Practical value"), ta("nextAction", "Suggested next action", "Practical value"),
      t("correctionStatus", "Correction status", "Corrections"), ta("updateNotes", "Update notes", "Corrections"),
    ],
  },
  {
    // Title, category and details are in Basics; an optional video and photo under Main details. Members' remarks are added on the tip's page.
    type: "BUSINESS_TIP", label: "Business tip", model: "businessTip",
    labels: { title: "Title", overview: "Details *", category: "Category", main: "Video and photo (optional)", mainNote: "A video plays at the top of the tip. A photo shows on its card when there is no video." },
    fields: [
      { ...u("videoUrl", "Video link", MAIN), help: "Paste a YouTube link, e.g. https://www.youtube.com/watch?v=…" },
      { ...u("pictureUrl", "Photo", MAIN), upload: "image" },
    ],
  },
];

export const directoryFor = (type: string) => DIRECTORIES.find((x) => x.type === type);

export const RELATIONSHIP_TYPES = [
  "needs_machine", "needs_supplier", "fits_funding", "uses_guide", "uses_tool", "uses_recipe", "expert_help", "hosted_on_website", "related_news", "related",
] as const;

/** Directories the admin can add and list. Recipes stay out at the client's request (existing ones still open by link). */
export const ADMIN_DIRECTORIES = DIRECTORIES.filter((x) => x.type !== "RECIPE");

/** Directories that are free for everyone: always saved as PUBLIC, never gated (client, 14 Nov 2026). */
export const FREE_TYPES = new Set<ContentType>(["NEWS", "WEBSITE", "BUSINESS_TIP"]);

/**
 * Member detail on a gated page (access level not PUBLIC, viewer not a member):
 * contacts, prices, funding amounts and terms, fees and downloads. The public page
 * checks this on the server and never sends these values to a visitor.
 */
export const MEMBER_ONLY: Partial<Record<ContentType, { fields?: string[]; groups?: string[] }>> = {
  MACHINE: { fields: ["priceMin", "priceMax", "sources", "providerName", "providerPhone", "providerEmail", "providerWebsite"] },
  SUPPLIER: { fields: ["email", "phone", "whatsapp", "minimumOrder", "paymentMethods", "leadTime"] },
  FUNDING_PROGRAMME: { fields: ["amountMin", "amountMax", "minAnnualTurnover", "matchingContribution", "amountBasis", "officialTermsUrl", "tenor", "howToApply", "funderPhone", "funderEmail", "funderWebsite"], groups: ["Loan terms", "Grant terms", "Equity terms"] },
  INVESTMENT_OPPORTUNITY: { groups: ["Terms", "Application", "Claims"], fields: ["capitalSought", "minimumParticipation", "useOfFunds"] },
  CONSULTANT: { fields: ["email", "phone", "feeMin", "feeMax", "bookingUrl", "profileUrl"] },
  GUIDE: { fields: ["downloadUrl"] },
  TOOL: { fields: ["downloadUrl", "calculatorRoute"] },
  // A useful website's address and links: what membership opens (client, 9 Nov 2026)
  WEBSITE: { fields: ["canonicalUrl", "pricingUrl", "redirectUrl"] },
};

export const isMemberOnly = (type: ContentType, f: Field) => {
  const m = MEMBER_ONLY[type];
  return Boolean(m && (m.fields?.includes(f.name) || (f.group && m.groups?.includes(f.group))));
};

/** The names of the filled member-only fields, for "what membership opens". A from/to pair counts once. Names only: never the values. */
export const memberOnlyLabels = (type: ContentType, record: Record<string, unknown>) => {
  const filled = (v: unknown) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0);
  const fields = directoryFor(type)?.fields.filter((f) => isMemberOnly(type, f) && filled(record[f.name])) ?? [];
  return [...new Set(fields.map((f) => f.label.replace(/,?\s+(from|to|up to)$/i, "")))];
};

/** Amount fields shown with the record's currency. */
export const MONEY_FIELDS = new Set(["capitalMin", "capitalMax", "priceMin", "priceMax", "amountMin", "amountMax", "minAnnualTurnover", "capitalSought", "minimumParticipation", "feeMin", "feeMax"]);

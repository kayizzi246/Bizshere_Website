import type { ContentType } from "@prisma/client";

/**
 * Admin entry-form definitions, one per directory (blueprint sections 04–13).
 * The admin form (src/app/admin/content/ContentForm.tsx) and the save action
 * (src/app/admin/content/actions.ts) are both driven by this file, so adding a
 * column means: add it to schema.prisma, migrate, then add one line here.
 *
 * `name` must match the Prisma field on the specialised model exactly.
 */
export type FieldKind = "text" | "textarea" | "int" | "decimal" | "bool" | "date" | "list" | "enum" | "url" | "json";
export type Field = { name: string; label: string; kind: FieldKind; options?: string[]; help?: string; required?: boolean; group?: string };

/** Child rows edited as one line each in a textarea. */
export type ChildList = { key: "ideaSteps" | "guideSteps" | "recipeSteps" | "recipeIngredients" | "guideDocuments"; label: string; help: string };

export type Directory = {
  type: ContentType;
  label: string;
  model: "businessIdea" | "machine" | "supplier" | "fundingProgramme" | "investmentOpportunity" | "guide" | "consultant" | "recipe" | "tool" | "website" | "news";
  /** Extra required link chosen in the form. */
  link?: { field: "organizationId" | "providerId"; label: string };
  /** Form labels for the shared fields, in the client's wording (e.g. "Machine name", "Brief"). */
  labels?: { title?: string; shortSummary?: string; overview?: string; category?: string };
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
const cur = (group?: string): Field => ({ name: "currency", label: "Currency (ISO code)", kind: "text", group, help: "e.g. UGX, USD" });

const MONEY_HELP = "Leave empty if unknown. Don't enter 0 unless it really is zero.";

export const DIRECTORIES: Directory[] = [
  {
    type: "BUSINESS_IDEA", label: "Business idea", model: "businessIdea",
    labels: { title: "Business idea name", shortSummary: "Brief", overview: "Description", category: "Category" },
    fields: [
      t("businessType", "Business type", MAIN, "e.g. Manufacturing, Retail, Service"), ta("keyRequirements", "Key requirements", MAIN),
      ta("successFactors", "Success factors", MAIN), ta("remarks", "Remarks", MAIN),
      ta("businessModel", "Business model", "Concept"), ta("productsOrServices", "Products or services", "Concept"),
      ta("customerProblem", "Customer problem", "Concept"), ta("valueProposition", "Value proposition", "Concept"),
      e("experienceLevel", "Experience level", ["BEGINNER", "INTERMEDIATE", "ADVANCED"], "Suitability"),
      ta("requiredSkills", "Required skills", "Suitability"), t("ownerTimeCommitment", "Owner time commitment", "Suitability"),
      ta("locationRequirements", "Location requirements", "Suitability"), b("homeBasedSuitable", "Can be home-based", "Suitability"),
      ta("targetCustomers", "Target customers", "Market"), ta("demandEvidence", "Demand evidence", "Market"),
      ta("competitorNotes", "Competitors", "Market"), ta("salesChannels", "Sales channels", "Market"), t("seasonality", "Seasonality", "Market"),
      ta("premisesRequirements", "Premises", "Implementation"), ta("staffingRequirements", "Staffing", "Implementation"),
      i("staffCount", "Staff count", "Implementation"), ta("licencesToInvestigate", "Licences and registrations to investigate", "Implementation"),
      ta("operatingCosts", "Operating costs", "Operating economics"), ta("sellingPriceAssumption", "Selling-price assumptions", "Operating economics"),
      ta("salesVolumeAssumption", "Sales-volume assumptions", "Operating economics"), ta("workingCapitalNotes", "Working capital", "Operating economics"),
      ta("majorRisks", "Major risks", "Assessment"),
      ta("riskReductionActions", "Risk reduction", "Assessment"), ta("growthOptions", "Growth options", "Assessment"),
    ],
    children: [{ key: "ideaSteps", label: "Startup steps", help: "One step per line: Title | description" }],
  },
  {
    type: "MACHINE", label: "Machine", model: "machine",
    labels: { title: "Machine name", shortSummary: "Brief", overview: "Description", category: "Category" },
    fields: [
      ta("function", "Function", MAIN), t("machineType", "Type", MAIN),
      d("priceMin", "Price from", MAIN, MONEY_HELP), d("priceMax", "Price to", MAIN, "Same as the first box for a single price"), cur(MAIN),
      ta("sources", "Source", MAIN, "Where to buy it, in Uganda and overseas"), u("pictureUrl", "Picture (image URL)", MAIN),
      l("videoUrls", "Videos (links)", MAIN), ta("remarks", "Remarks", MAIN),
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
    type: "SUPPLIER", label: "Supplier", model: "supplier",
    link: { field: "organizationId", label: "Organization" },
    labels: { title: "Supplier name", shortSummary: "Brief (optional)", overview: "About (optional)", category: "Category" },
    fields: [
      e("supplierType", "Type", ["MANUFACTURER", "DISTRIBUTOR", "WHOLESALER", "RETAILER", "IMPORTER", "SERVICE_PROVIDER"], MAIN),
      t("country", "Country", MAIN), l("items", "Items supplied", MAIN),
      t("email", "Email", MAIN, "Shown to members only"), t("phone", "Phone", MAIN, "Shown to members only"), u("website", "Website", MAIN),
      i("yearsEstablished", "Year established (only if confirmed)", "Profile"), l("brandsSupplied", "Brands supplied", "Products"),
      t("minimumOrder", "Minimum order", "Commercial terms"), b("sellsWholesale", "Sells wholesale", "Commercial terms"), b("sellsRetail", "Sells retail", "Commercial terms"),
      l("paymentMethods", "Payment methods", "Commercial terms"), ta("deliveryAreas", "Delivery areas", "Commercial terms"), t("leadTime", "Lead time", "Commercial terms"), ta("returnsPolicy", "Returns policy", "Commercial terms"),
      b("offersInstallation", "Installation", "Service capability"), b("offersMaintenance", "Maintenance", "Service capability"), b("offersTraining", "Training", "Service capability"),
      b("sparePartsLocal", "Spare parts locally", "Service capability"), b("exportCapability", "Exports", "Service capability"), b("listingClaimed", "Listing claimed by the business", "Trust"),
    ],
  },
  {
    type: "FUNDING_PROGRAMME", label: "Funding programme", model: "fundingProgramme",
    link: { field: "providerId", label: "Fund provider" },
    labels: { title: "Fund name", shortSummary: "Brief", overview: "Description (optional)", category: "Category" },
    fields: [
      e("fundingType", "Fund type", ["LOAN", "GRANT", "EQUITY", "GUARANTEE", "OTHER"], MAIN),
      t("providerCategory", "Provider category", MAIN, "e.g. Bank, Government agency, Private"),
      ta("eligibilityText", "Eligibility", MAIN),
      d("amountMin", "Amount given, from", MAIN, MONEY_HELP), d("amountMax", "Amount given, up to", MAIN, "A ceiling, not a guarantee"), cur(MAIN),
      l("eligibleBusinessTypes", "Eligible business types", MAIN), u("officialTermsUrl", "Source link", MAIN),
      ta("purpose", "Purpose", "Programme"), b("requiresRegistration", "Registration required", "Eligibility"),
      i("minOperatingMonths", "Minimum months operating", "Eligibility"), d("minAnnualTurnover", "Minimum annual turnover", "Eligibility", MONEY_HELP), ta("applicantRequirements", "Applicant requirements", "Eligibility"),
      t("amountBasis", "Amount basis", "Amount"), t("matchingContribution", "Matching contribution", "Amount"),
      d("interestRate", "Interest rate (%)", "Loan terms"), t("rateBasis", "Rate basis", "Loan terms", "e.g. per year, flat"), e("rateType", "Rate type", ["FIXED", "VARIABLE"], "Loan terms"),
      ta("fees", "Fees", "Loan terms"), i("repaymentMonths", "Repayment period (months)", "Loan terms"), t("repaymentFrequency", "Repayment frequency", "Loan terms"),
      i("gracePeriodMonths", "Grace period (months)", "Loan terms"), b("collateralRequired", "Collateral required", "Loan terms"), b("guarantorRequired", "Guarantor required", "Loan terms"),
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
    type: "GUIDE", label: "Business information / guideline", model: "guide",
    labels: { title: "Title", shortSummary: "Brief (optional)", overview: "Description", category: "Category" },
    fields: [
      t("resourceType", "Doc type", MAIN, "e.g. Guideline, Book, Video, Website, Investment opportunity, Form"),
      u("downloadUrl", "Download link", MAIN),
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
    type: "CONSULTANT", label: "Consultant / expert", model: "consultant",
    labels: { title: "Page title (usually the consultant's name)", shortSummary: "Brief (optional)", overview: "Profile", category: "Category" },
    fields: [
      { name: "fullName", label: "Consultant name", kind: "text", required: true, group: MAIN }, l("specialties", "Specialty", MAIN),
      t("country", "Country", MAIN), t("district", "District", MAIN),
      t("email", "Email", MAIN, "Shown to members only"), t("phone", "Phone", MAIN, "Shown to members only"), u("website", "Website", MAIN),
      t("professionalTitle", "Professional title", "Identity"), u("photoUrl", "Photo URL", "Identity"),
      l("languages", "Languages", "Expertise"), l("deliveryModes", "Delivery modes", "Expertise"), ta("experience", "Experience", "Experience"),
      d("feeMin", "Fee from", "Fees", MONEY_HELP), d("feeMax", "Fee to", "Fees", MONEY_HELP), cur("Fees"), t("pricingBasis", "Pricing basis", "Fees", "per hour, per day, per project"),
      i("consultationMins", "Consultation length (min)", "Fees"), b("quotationRequired", "Quotation required", "Fees"),
      t("availability", "Availability", "Availability"), t("responseTime", "Response time", "Availability"), u("bookingUrl", "Booking / enquiry link", "Availability"),
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
    type: "TOOL", label: "Tool / template", model: "tool",
    labels: { title: "Tool name", shortSummary: "Brief (optional)", overview: "Description", category: "Category" },
    fields: [
      e("toolType", "Tool type", ["TEMPLATE", "CALCULATOR", "CHECKLIST"], MAIN), u("downloadUrl", "Download link", MAIN),
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
    type: "NEWS", label: "News article", model: "news",
    fields: [
      e("articleType", "Type", ["NEWS", "REPORT", "ANALYSIS", "OPINION"], "Article"), ta("standfirst", "Standfirst", "Article"), { name: "body", label: "Body", kind: "textarea", group: "Article" },
      t("author", "Author", "Attribution"), t("publisher", "Publisher", "Attribution"), u("originalUrl", "Original URL", "Attribution"), l("sourceLinks", "Source links", "Attribution"), t("imageCredit", "Image credit", "Attribution"),
      dt("eventDate", "Event date", "Dates"), dt("effectiveDate", "Takes effect", "Dates"),
      ta("whatChanged", "What changed", "Practical value"), ta("whoAffected", "Who is affected", "Practical value"), ta("nextAction", "Suggested next action", "Practical value"),
      t("correctionStatus", "Correction status", "Corrections"), ta("updateNotes", "Update notes", "Corrections"),
    ],
  },
];

export const directoryFor = (type: string) => DIRECTORIES.find((x) => x.type === type);

export const RELATIONSHIP_TYPES = [
  "needs_machine", "needs_supplier", "fits_funding", "uses_guide", "uses_tool", "uses_recipe", "expert_help", "hosted_on_website", "related_news", "related",
] as const;

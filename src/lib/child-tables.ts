import type { ContentType, Prisma } from "@prisma/client";
import type { FieldKind } from "./content-fields";

/**
 * Repeatable child records from the blueprint (offers, listings, branches, contacts, rounds,
 * fees, services, qualifications, projects, reviews, versions, test cases, media), one entry each.
 * The admin editor (src/app/admin/content/ChildTableEditor.tsx), its save action
 * (child-table-actions.ts) and the public display (src/components/ChildSections.tsx) all read
 * this list, so a new child table means: add it to schema.prisma, migrate, add one entry here.
 *
 * Server-only: entries hold functions.
 */
export type RefKind = "supplier" | "machine" | "product" | "district" | "toolVersion";
export type ChildField = {
  name: string;
  label: string;
  kind: FieldKind | "ref";
  ref?: RefKind;
  options?: string[];
  required?: boolean;
  help?: string;
  /** Member detail: replaced by a lock on gated pages, never sent to visitors. */
  member?: boolean;
  /** Editor-only: never shown on the public page (moderation notes, evidence). */
  internal?: boolean;
  /** Adds an "Upload" button that stores the file and fills in its address. */
  upload?: "image" | "file";
};

export type ChildModel =
  | "supplierOffer" | "supplierProductListing" | "organizationLocation" | "contact" | "applicationRound"
  | "guideFee" | "guideStep" | "guideDocument" | "consultantService" | "consultantQualification" | "consultantProject"
  | "consultantReview" | "toolVersion" | "toolTestCase" | "mediaAsset";

/** Which id the rows hang off: the specialised record, the content item, or the supplier's organization. */
export type ParentIds = { record: string; item: string; org: string | null };

export type ChildTable = {
  key: string;
  model: ChildModel;
  label: string;
  item: string;
  intro?: string;
  parents: ContentType[] | "ALL";
  /** Rows belonging to the parent. */
  scope: (p: ParentIds) => Record<string, unknown> | null;
  /** Columns set from the parent when a row is created (omitted when a ref field sets the link). */
  link?: (p: ParentIds) => Record<string, string> | null;
  fields: ChildField[];
  /** Field (or ref) used as the row's heading. */
  heading: string;
  orderBy?: Record<string, "asc" | "desc">;
  /** Only these rows are public. */
  publicWhere?: Record<string, unknown>;
  /** Edited elsewhere (or on the other side of the link); shown on the public page only. */
  displayOnly?: boolean;
  /** Admin only; never on the public page. */
  adminOnly?: boolean;
  /** Public layout. */
  layout?: "cards" | "steps" | "gallery";
};

const t = (name: string, label: string, extra: Partial<ChildField> = {}): ChildField => ({ name, label, kind: "text", ...extra });
const ta = (name: string, label: string, extra: Partial<ChildField> = {}): ChildField => ({ name, label, kind: "textarea", ...extra });
const d = (name: string, label: string, extra: Partial<ChildField> = {}): ChildField => ({ name, label, kind: "decimal", ...extra });
const i = (name: string, label: string, extra: Partial<ChildField> = {}): ChildField => ({ name, label, kind: "int", ...extra });
const b = (name: string, label: string, extra: Partial<ChildField> = {}): ChildField => ({ name, label, kind: "bool", ...extra });
const dt = (name: string, label: string, extra: Partial<ChildField> = {}): ChildField => ({ name, label, kind: "date", ...extra });
const u = (name: string, label: string, extra: Partial<ChildField> = {}): ChildField => ({ name, label, kind: "url", ...extra });
const e = (name: string, label: string, options: string[], extra: Partial<ChildField> = {}): ChildField => ({ name, label, kind: "enum", options, ...extra });
const ref = (name: string, label: string, kind: RefKind, extra: Partial<ChildField> = {}): ChildField => ({ name, label, kind: "ref", ref: kind, ...extra });

const STATUS = ["DRAFT", "IN_REVIEW", "PUBLISHED", "ARCHIVED"];
const MONEY = "Leave empty if unknown. Don't enter 0 unless it really is zero.";

// Offer terms, shared by the machine side (choose the supplier) and the supplier side (shows the machine).
const offerTerms: ChildField[] = [
  e("condition", "Condition", ["NEW", "USED", "REFURBISHED"], { required: true }),
  d("priceMin", "Price from", { member: true, help: MONEY }), d("priceMax", "Price to", { member: true }), t("currency", "Currency", { help: "e.g. UGX, USD" }),
  i("minimumOrder", "Minimum order"), t("availability", "Availability"), t("taxTreatment", "Tax treatment", { help: "e.g. VAT inclusive" }),
  t("deliveryCoverage", "Delivery coverage"), d("deliveryCharge", "Delivery charge", { member: true }), t("leadTime", "Lead time"),
  i("warrantyMonths", "Warranty (months)"), b("installationSupport", "Installation support"), b("trainingSupport", "Training support"),
  b("sparePartsLocal", "Spare parts locally"), u("quotationUrl", "Quotation", { member: true, upload: "file" }),
  dt("quotedAt", "Quotation date"), dt("validUntil", "Valid until"), e("status", "Status", STATUS, { required: true, internal: true }),
];

const contactFields: ChildField[] = [
  t("personName", "Contact person"), t("personRole", "Role"), t("email", "Email", { member: true }), t("phone", "Phone", { member: true }),
  t("whatsapp", "WhatsApp", { member: true }), u("website", "Website"), t("preferredMethod", "Preferred contact method"), b("isPrimary", "Main contact"),
];

export const CHILD_TABLES: ChildTable[] = [
  {
    key: "offers", model: "supplierOffer", label: "Supplier offers", item: "offer", parents: ["MACHINE"],
    intro: "Each seller's dated offer for this machine. Only published offers show on the page.",
    scope: (p) => ({ machineId: p.record }), link: (p) => ({ machineId: p.record }),
    fields: [ref("supplierId", "Supplier", "supplier", { required: true }), ...offerTerms],
    heading: "supplierId", orderBy: { quotedAt: "desc" }, publicWhere: { status: "PUBLISHED" },
  },
  {
    key: "supplier-offers", model: "supplierOffer", label: "Machine offers", item: "offer", parents: ["SUPPLIER"],
    scope: (p) => ({ supplierId: p.record }),
    fields: [ref("machineId", "Machine", "machine", { required: true }), ...offerTerms],
    heading: "machineId", orderBy: { quotedAt: "desc" }, publicWhere: { status: "PUBLISHED" }, displayOnly: true,
  },
  {
    key: "listings", model: "supplierProductListing", label: "Products supplied", item: "product listing", parents: ["SUPPLIER"],
    intro: "For a machine, add a supplier offer on the machine's page instead.",
    scope: (p) => ({ supplierId: p.record }), link: (p) => ({ supplierId: p.record }),
    fields: [
      t("productName", "Product", { required: true }), ref("productId", "Linked product (market prices)", "product"),
      ta("specifications", "Specifications"), t("unit", "Unit"), d("minimumOrderQuantity", "Minimum order quantity"), t("availability", "Availability"),
      d("priceMin", "Price from", { member: true, help: MONEY }), d("priceMax", "Price to", { member: true }), t("currency", "Currency"),
      dt("quotedAt", "Quoted on"), dt("validUntil", "Valid until"),
    ],
    heading: "productName", orderBy: { productName: "asc" },
  },
  {
    key: "branches", model: "organizationLocation", label: "Locations and branches", item: "location", parents: ["SUPPLIER"],
    scope: (p) => (p.org ? { organizationId: p.org } : null), link: (p) => (p.org ? { organizationId: p.org } : null),
    fields: [
      t("label", "Name", { help: "e.g. Head office, Mbarara branch" }), ref("locationId", "District", "district"), t("town", "Town"),
      ta("physicalAddress", "Physical address"), d("latitude", "Latitude", { internal: true }), d("longitude", "Longitude", { internal: true }), b("isPrimary", "Main location"),
    ],
    heading: "label", orderBy: { isPrimary: "desc" },
  },
  {
    key: "org-contacts", model: "contact", label: "Contacts", item: "contact", parents: ["SUPPLIER"],
    scope: (p) => (p.org ? { organizationId: p.org } : null), link: (p) => (p.org ? { organizationId: p.org } : null),
    fields: contactFields, heading: "personName", orderBy: { isPrimary: "desc" },
  },
  {
    key: "rounds", model: "applicationRound", label: "Application rounds", item: "round", parents: ["FUNDING_PROGRAMME"],
    scope: (p) => ({ programmeId: p.record }),
    fields: [
      e("status", "Status", ["UPCOMING", "OPEN", "CLOSED"]), dt("opensAt", "Opens"), dt("closesAt", "Closes"), t("timeZone", "Time zone"),
      b("isRolling", "Rolling applications"), u("applicationUrl", "Apply here"), { name: "requiredDocuments", label: "Required documents", kind: "list" }, ta("process", "Process"),
    ],
    heading: "status", orderBy: { opensAt: "desc" }, displayOnly: true,
  },
  {
    key: "steps", model: "guideStep", label: "Steps", item: "step", parents: ["GUIDE"],
    scope: (p) => ({ guideId: p.record }),
    fields: [ta("instruction", "Instruction"), b("isOfficial", "Official step")],
    heading: "instruction", orderBy: { stepNumber: "asc" }, displayOnly: true, layout: "steps",
  },
  {
    key: "documents", model: "guideDocument", label: "Required documents", item: "document", parents: ["GUIDE"],
    scope: (p) => ({ guideId: p.record }),
    fields: [t("name", "Document"), ta("notes", "Notes")],
    heading: "name", displayOnly: true,
  },
  {
    key: "fees", model: "guideFee", label: "Official fees", item: "fee", parents: ["GUIDE"],
    intro: "Each fee with its basis, processing time and the date it was checked.",
    scope: (p) => ({ guideId: p.record }), link: (p) => ({ guideId: p.record }),
    fields: [
      t("description", "Fee", { required: true }), d("amount", "Amount", { help: MONEY }), t("currency", "Currency"),
      t("feeBasis", "Fee basis", { help: "e.g. per application, per year" }), t("processingTime", "Processing time"), dt("checkedAt", "Checked on"),
    ],
    heading: "description",
  },
  {
    key: "services", model: "consultantService", label: "Services", item: "service", parents: ["CONSULTANT"],
    scope: (p) => ({ consultantId: p.record }), link: (p) => ({ consultantId: p.record }),
    fields: [t("name", "Service", { required: true }), ta("description", "Description"), ta("deliverables", "Deliverables"), t("deliveryMode", "Delivery mode"), t("coverage", "Geographic coverage")],
    heading: "name",
  },
  {
    key: "qualifications", model: "consultantQualification", label: "Qualifications", item: "qualification", parents: ["CONSULTANT"],
    scope: (p) => ({ consultantId: p.record }), link: (p) => ({ consultantId: p.record }),
    fields: [t("qualification", "Qualification", { required: true }), t("institution", "Awarding institution"), t("professionalBody", "Professional membership"), t("registrationReference", "Registration reference"), i("year", "Year")],
    heading: "qualification", orderBy: { year: "desc" },
  },
  {
    key: "projects", model: "consultantProject", label: "Experience and case studies", item: "project", parents: ["CONSULTANT"],
    intro: "Only projects marked 'publication permitted' show on the page.",
    scope: (p) => ({ consultantId: p.record }), link: (p) => ({ consultantId: p.record }),
    fields: [
      t("title", "Project", { required: true }), t("clientName", "Client"), i("year", "Year"), ta("summary", "Summary"), ta("outcome", "Outcome"),
      b("isCaseStudy", "Case study"), b("publicationPermitted", "Publication permitted", { internal: true }), t("referenceContact", "Reference contact", { member: true }),
    ],
    heading: "title", orderBy: { year: "desc" }, publicWhere: { publicationPermitted: true },
  },
  {
    key: "reviews", model: "consultantReview", label: "Client reviews", item: "review", parents: ["CONSULTANT"],
    intro: "Kept apart from profile verification. Only approved reviews show, marked when the engagement was confirmed.",
    scope: (p) => ({ consultantId: p.record }), link: (p) => ({ consultantId: p.record }),
    fields: [
      i("rating", "Rating (1–5)", { required: true }), ta("body", "Review"), b("confirmedEngagement", "Engagement confirmed"),
      ta("engagementEvidence", "Engagement evidence", { internal: true }), e("moderation", "Moderation", ["PENDING", "APPROVED", "REJECTED"], { required: true, internal: true }),
    ],
    heading: "rating", orderBy: { createdAt: "desc" }, publicWhere: { moderation: "APPROVED" },
  },
  {
    key: "contacts", model: "contact", label: "Contacts", item: "contact", parents: ["CONSULTANT"],
    scope: (p) => ({ consultantId: p.record }), link: (p) => ({ consultantId: p.record }),
    fields: contactFields, heading: "personName", orderBy: { isPrimary: "desc" },
  },
  {
    key: "versions", model: "toolVersion", label: "Versions", item: "version", parents: ["TOOL"],
    intro: "Each release with its date and changes. Calculations stay tied to the rules of their version.",
    scope: (p) => ({ toolId: p.record }), link: (p) => ({ toolId: p.record }),
    fields: [
      t("versionNumber", "Version", { required: true }), dt("releasedAt", "Released", { required: true }), ta("changeNotes", "Changes"),
      b("superseded", "Superseded"), u("fileUrl", "File", { member: true, upload: "file" }), { name: "ruleDefinition", label: "Rule definition (JSON)", kind: "json", internal: true },
    ],
    heading: "versionNumber", orderBy: { releasedAt: "desc" },
  },
  {
    key: "test-cases", model: "toolTestCase", label: "Validation test cases", item: "test case", parents: ["TOOL"],
    intro: "Inputs and expected outputs used to check a calculator version. Not shown on the public page.",
    scope: (p) => ({ toolVersion: { toolId: p.record } }),
    fields: [
      ref("toolVersionId", "Version", "toolVersion", { required: true }), { name: "inputs", label: "Inputs (JSON)", kind: "json", required: true },
      { name: "expectedOutput", label: "Expected output (JSON)", kind: "json", required: true }, dt("lastValidatedAt", "Last validated"),
    ],
    heading: "toolVersionId", adminOnly: true,
  },
  {
    key: "media", model: "mediaAsset", label: "Photos and media", item: "media file", parents: "ALL", layout: "gallery",
    intro: "Extra photos, videos, manuals and documents. Members-only files stay locked for visitors.",
    scope: (p) => ({ contentItemId: p.item }), link: (p) => ({ contentItemId: p.item }),
    fields: [
      u("fileLocation", "File or image", { required: true, upload: "file" }), e("mediaType", "Type", ["image", "video", "document"], { required: true }),
      t("caption", "Caption"), t("altText", "Alt text (describes the image)"), t("credit", "Credit"), t("usagePermission", "Usage permission", { internal: true }),
      i("displayOrder", "Order"), e("accessLevel", "Access", ["PUBLIC", "PREVIEW", "MEMBERS"], { required: true, internal: true }),
    ],
    heading: "caption", orderBy: { displayOrder: "asc" },
  },
];

export const tablesFor = (type: ContentType) => CHILD_TABLES.filter((x) => x.parents === "ALL" || x.parents.includes(type));
export const childTable = (key: string) => CHILD_TABLES.find((x) => x.key === key);

/** Prisma delegate for a child model (one shape for all: findMany / create / updateMany / deleteMany). */
export type ChildDelegate = {
  findMany(args: { where: Record<string, unknown>; orderBy?: Record<string, "asc" | "desc">; include?: Record<string, unknown> }): Promise<Record<string, unknown>[]>;
  create(args: { data: Record<string, unknown> }): Promise<{ id: string }>;
  updateMany(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<{ count: number }>;
  deleteMany(args: { where: Record<string, unknown> }): Promise<{ count: number }>;
};
export const delegate = (client: Prisma.TransactionClient | object, model: ChildModel) => (client as unknown as Record<ChildModel, ChildDelegate>)[model];

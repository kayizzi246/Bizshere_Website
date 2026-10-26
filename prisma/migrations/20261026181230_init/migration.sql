-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'CONTRIBUTOR', 'EDITOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('BUSINESS_IDEA', 'MACHINE', 'SUPPLIER', 'FUNDING_PROGRAMME', 'INVESTMENT_OPPORTUNITY', 'GUIDE', 'CONSULTANT', 'RECIPE', 'TOOL', 'WEBSITE', 'NEWS');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AccessLevel" AS ENUM ('PUBLIC', 'PREVIEW', 'MEMBERS');

-- CreateEnum
CREATE TYPE "BusinessStage" AS ENUM ('IDEA', 'STARTING', 'GROWING', 'ESTABLISHED');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('COUNTRY', 'REGION', 'DISTRICT', 'TOWN');

-- CreateEnum
CREATE TYPE "CategoryKind" AS ENUM ('INDUSTRY', 'BUSINESS_TYPE', 'MACHINE_CATEGORY', 'PRODUCT_CATEGORY', 'GUIDE_PROCESS', 'RECIPE_CATEGORY', 'TOOL_CATEGORY', 'WEBSITE_CATEGORY', 'NEWS_CATEGORY', 'SERVICE_SPECIALTY');

-- CreateEnum
CREATE TYPE "CheckType" AS ENUM ('BUSINESS_CONTACT', 'REGISTRATION', 'PHYSICAL_ADDRESS', 'IDENTITY', 'CREDENTIAL', 'PROFESSIONAL_REGISTRATION', 'OFFICIAL_TERMS', 'PRICE_EVIDENCE', 'LINK');

-- CreateEnum
CREATE TYPE "CheckResult" AS ENUM ('PASSED', 'FAILED', 'NOT_CHECKED');

-- CreateEnum
CREATE TYPE "ClaimType" AS ENUM ('SOURCE_FACT', 'EDITOR_EXPLANATION', 'ESTIMATE', 'PROMOTER_CLAIM');

-- CreateEnum
CREATE TYPE "OrgStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "OrgAccountType" AS ENUM ('SUPPLIER', 'MACHINE_DEALER', 'CONSULTANCY', 'FUNDING_PROVIDER', 'SERVICE_PROVIDER');

-- CreateEnum
CREATE TYPE "OrgMemberRole" AS ENUM ('OWNER', 'STAFF');

-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "ScenarioLevel" AS ENUM ('LOW', 'STANDARD', 'HIGHER');

-- CreateEnum
CREATE TYPE "MachineCondition" AS ENUM ('NEW', 'USED', 'REFURBISHED');

-- CreateEnum
CREATE TYPE "SupplierType" AS ENUM ('MANUFACTURER', 'DISTRIBUTOR', 'WHOLESALER', 'RETAILER', 'IMPORTER', 'SERVICE_PROVIDER');

-- CreateEnum
CREATE TYPE "FundingType" AS ENUM ('LOAN', 'GRANT', 'EQUITY', 'GUARANTEE', 'OTHER');

-- CreateEnum
CREATE TYPE "RateType" AS ENUM ('FIXED', 'VARIABLE');

-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('UPCOMING', 'OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "PriceType" AS ENUM ('RETAIL', 'WHOLESALE', 'FARM_GATE');

-- CreateEnum
CREATE TYPE "ToolType" AS ENUM ('TEMPLATE', 'CALCULATOR', 'CHECKLIST');

-- CreateEnum
CREATE TYPE "AccessCost" AS ENUM ('FREE', 'PAID', 'FREEMIUM');

-- CreateEnum
CREATE TYPE "ArticleType" AS ENUM ('NEWS', 'REPORT', 'ANALYSIS', 'OPINION');

-- CreateEnum
CREATE TYPE "PlanAudience" AS ENUM ('MEMBER', 'BUSINESS');

-- CreateEnum
CREATE TYPE "BillingPeriod" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('MTN_MOMO', 'AIRTEL_MONEY', 'CARD', 'BANK_TRANSFER', 'MANUAL');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "SubmissionType" AS ENUM ('NEW_BUSINESS', 'LISTING', 'SUPPLIER_OFFER', 'PRICE_OBSERVATION', 'FUNDING_ROUND', 'CORRECTION');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('NEW', 'REPLIED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ReviewModeration" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AlertKind" AS ENUM ('DEADLINE', 'PRICE', 'CONTENT_UPDATED', 'SAVED_SEARCH', 'SUBMISSION', 'SYSTEM');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "isSuspended" BOOLEAN NOT NULL DEFAULT false,
    "lastActiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "tradingName" TEXT,
    "accountType" "OrgAccountType" NOT NULL,
    "registrationNumber" TEXT,
    "tin" TEXT,
    "description" TEXT,
    "website" TEXT,
    "logoUrl" TEXT,
    "status" "OrgStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_members" (
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "OrgMemberRole" NOT NULL DEFAULT 'OWNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("userId","organizationId")
);

-- CreateTable
CREATE TABLE "organization_categories" (
    "organizationId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "organization_categories_pkey" PRIMARY KEY ("organizationId","categoryId")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "LocationType" NOT NULL,
    "parentId" TEXT,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_locations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT,
    "label" TEXT,
    "town" TEXT,
    "physicalAddress" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "organization_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "consultantId" TEXT,
    "personName" TEXT,
    "personRole" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "website" TEXT,
    "preferredMethod" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" "CategoryKind" NOT NULL,
    "parentId" TEXT,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "baseCode" TEXT,
    "toBase" DECIMAL(18,6),

    CONSTRAINT "units_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "content_items" (
    "id" TEXT NOT NULL,
    "contentType" "ContentType" NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortSummary" TEXT,
    "overview" TEXT,
    "primaryCategoryId" TEXT,
    "businessStages" "BusinessStage"[],
    "coverageNotes" TEXT,
    "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "accessLevel" "AccessLevel" NOT NULL DEFAULT 'PREVIEW',
    "publishedAt" TIMESTAMP(3),
    "lastReviewedAt" TIMESTAMP(3),
    "nextReviewDueAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdById" TEXT,
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_categories" (
    "contentItemId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "content_categories_pkey" PRIMARY KEY ("contentItemId","categoryId")
);

-- CreateTable
CREATE TABLE "content_locations" (
    "contentItemId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,

    CONSTRAINT "content_locations_pkey" PRIMARY KEY ("contentItemId","locationId")
);

-- CreateTable
CREATE TABLE "audiences" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "audiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_audiences" (
    "contentItemId" TEXT NOT NULL,
    "audienceId" TEXT NOT NULL,

    CONSTRAINT "content_audiences_pkey" PRIMARY KEY ("contentItemId","audienceId")
);

-- CreateTable
CREATE TABLE "content_entitlements" (
    "contentItemId" TEXT NOT NULL,
    "entitlement" TEXT NOT NULL,

    CONSTRAINT "content_entitlements_pkey" PRIMARY KEY ("contentItemId","entitlement")
);

-- CreateTable
CREATE TABLE "sources" (
    "id" TEXT NOT NULL,
    "publisherName" TEXT,
    "sourceTitle" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sourceType" TEXT,
    "sourcePublishedAt" TIMESTAMP(3),
    "accessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_links" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "claimSupported" TEXT NOT NULL,
    "claimType" "ClaimType" NOT NULL DEFAULT 'SOURCE_FACT',
    "evidenceNotes" TEXT,

    CONSTRAINT "evidence_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT,
    "fileLocation" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "caption" TEXT,
    "altText" TEXT,
    "credit" TEXT,
    "usagePermission" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "accessLevel" "AccessLevel" NOT NULL DEFAULT 'PUBLIC',
    "ownerOrganizationId" TEXT,
    "reviewDueAt" TIMESTAMP(3),

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_versions" (
    "id" TEXT NOT NULL,
    "mediaAssetId" TEXT NOT NULL,
    "versionLabel" TEXT NOT NULL,
    "fileLocation" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "changeNotes" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "uploadedById" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_checks" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "checkType" "CheckType" NOT NULL,
    "result" "CheckResult" NOT NULL DEFAULT 'NOT_CHECKED',
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedById" TEXT,
    "evidenceReference" TEXT,
    "evidenceNotes" TEXT,
    "reviewDueAt" TIMESTAMP(3),

    CONSTRAINT "verification_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "related_content" (
    "fromItemId" TEXT NOT NULL,
    "toItemId" TEXT NOT NULL,
    "relationshipType" TEXT NOT NULL,
    "editorialNotes" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "related_content_pkey" PRIMARY KEY ("fromItemId","toItemId","relationshipType")
);

-- CreateTable
CREATE TABLE "content_revisions" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "editorId" TEXT,
    "snapshot" JSONB NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_ideas" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "businessModel" TEXT,
    "productsOrServices" TEXT,
    "customerProblem" TEXT,
    "valueProposition" TEXT,
    "experienceLevel" "ExperienceLevel",
    "requiredSkills" TEXT,
    "ownerTimeCommitment" TEXT,
    "locationRequirements" TEXT,
    "homeBasedSuitable" BOOLEAN,
    "targetCustomers" TEXT,
    "demandEvidence" TEXT,
    "competitorNotes" TEXT,
    "salesChannels" TEXT,
    "seasonality" TEXT,
    "premisesRequirements" TEXT,
    "staffingRequirements" TEXT,
    "staffCount" INTEGER,
    "licencesToInvestigate" TEXT,
    "operatingCosts" TEXT,
    "sellingPriceAssumption" TEXT,
    "salesVolumeAssumption" TEXT,
    "workingCapitalNotes" TEXT,
    "successFactors" TEXT,
    "majorRisks" TEXT,
    "riskReductionActions" TEXT,
    "growthOptions" TEXT,

    CONSTRAINT "business_ideas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idea_steps" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "idea_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_scenarios" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" "ScenarioLevel" NOT NULL DEFAULT 'STANDARD',
    "currency" TEXT NOT NULL DEFAULT 'UGX',
    "locationId" TEXT,
    "estimateDate" TIMESTAMP(3),
    "assumptions" TEXT,
    "operatingScale" TEXT,

    CONSTRAINT "budget_scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_lines" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "costCategory" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL DEFAULT 1,
    "unit" TEXT,
    "unitCost" DECIMAL(16,2),
    "unknownReason" TEXT,
    "frequency" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "isContingency" BOOLEAN NOT NULL DEFAULT false,
    "sourceId" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "budget_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "machines" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "manufacturer" TEXT,
    "brand" TEXT,
    "modelNumber" TEXT,
    "machineType" TEXT,
    "function" TEXT,
    "materialsProcessed" TEXT,
    "productsProduced" TEXT,
    "capacityMin" DECIMAL(14,3),
    "capacityMax" DECIMAL(14,3),
    "capacityUnit" TEXT,
    "capacityBasis" TEXT,
    "automationLevel" TEXT,
    "operatorsRequired" INTEGER,
    "powerSource" TEXT,
    "ratedPowerKw" DECIMAL(10,2),
    "voltage" INTEGER,
    "phase" INTEGER,
    "dimensions" TEXT,
    "weightKg" DECIMAL(10,2),
    "spaceRequirements" TEXT,
    "installationRequirements" TEXT,
    "consumables" TEXT,
    "maintenance" TEXT,
    "sparePartsNotes" TEXT,
    "trainingRequirements" TEXT,
    "safetyInstructions" TEXT,
    "specifications" JSONB,

    CONSTRAINT "machines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "supplierType" "SupplierType",
    "yearsEstablished" INTEGER,
    "minimumOrder" TEXT,
    "sellsWholesale" BOOLEAN,
    "sellsRetail" BOOLEAN,
    "paymentMethods" TEXT[],
    "brandsSupplied" TEXT[],
    "deliveryAreas" TEXT,
    "leadTime" TEXT,
    "returnsPolicy" TEXT,
    "offersInstallation" BOOLEAN,
    "offersMaintenance" BOOLEAN,
    "offersTraining" BOOLEAN,
    "sparePartsLocal" BOOLEAN,
    "exportCapability" BOOLEAN,
    "listingClaimed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_offers" (
    "id" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "condition" "MachineCondition" NOT NULL DEFAULT 'NEW',
    "priceMin" DECIMAL(16,2),
    "priceMax" DECIMAL(16,2),
    "currency" TEXT NOT NULL DEFAULT 'UGX',
    "minimumOrder" INTEGER,
    "availability" TEXT,
    "taxTreatment" TEXT,
    "deliveryCoverage" TEXT,
    "deliveryCharge" DECIMAL(16,2),
    "leadTime" TEXT,
    "warrantyMonths" INTEGER,
    "installationSupport" BOOLEAN,
    "trainingSupport" BOOLEAN,
    "sparePartsLocal" BOOLEAN,
    "quotationUrl" TEXT,
    "quotedAt" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "status" "PublicationStatus" NOT NULL DEFAULT 'IN_REVIEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "localNames" TEXT[],
    "categoryId" TEXT,
    "variety" TEXT,
    "grade" TEXT,
    "packaging" TEXT,
    "standardUnit" TEXT,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_product_listings" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "specifications" TEXT,
    "unit" TEXT,
    "minimumOrderQuantity" DECIMAL(14,3),
    "availability" TEXT,
    "priceMin" DECIMAL(16,2),
    "priceMax" DECIMAL(16,2),
    "currency" TEXT NOT NULL DEFAULT 'UGX',
    "quotedAt" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),

    CONSTRAINT "supplier_product_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funding_providers" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "providerCategory" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Uganda',

    CONSTRAINT "funding_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funding_programmes" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "fundingType" "FundingType" NOT NULL,
    "purpose" TEXT,
    "eligibilityText" TEXT,
    "requiresRegistration" BOOLEAN,
    "minOperatingMonths" INTEGER,
    "minAnnualTurnover" DECIMAL(16,2),
    "applicantRequirements" TEXT,
    "amountMin" DECIMAL(16,2),
    "amountMax" DECIMAL(16,2),
    "currency" TEXT NOT NULL DEFAULT 'UGX',
    "amountBasis" TEXT,
    "matchingContribution" TEXT,
    "interestRate" DECIMAL(6,3),
    "rateBasis" TEXT,
    "rateType" "RateType",
    "fees" TEXT,
    "repaymentMonths" INTEGER,
    "repaymentFrequency" TEXT,
    "gracePeriodMonths" INTEGER,
    "collateralRequired" BOOLEAN,
    "guarantorRequired" BOOLEAN,
    "eligibleExpenses" TEXT,
    "milestones" TEXT,
    "reportingRequirements" TEXT,
    "restrictions" TEXT,
    "investmentInstrument" TEXT,
    "ownershipTerms" TEXT,
    "governanceTerms" TEXT,
    "selectionCriteria" TEXT,
    "officialTermsUrl" TEXT,
    "termsVersionDate" TIMESTAMP(3),
    "termsLastCheckedAt" TIMESTAMP(3),

    CONSTRAINT "funding_programmes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_rounds" (
    "id" TEXT NOT NULL,
    "programmeId" TEXT NOT NULL,
    "opensAt" TIMESTAMP(3),
    "closesAt" TIMESTAMP(3),
    "timeZone" TEXT NOT NULL DEFAULT 'Africa/Kampala',
    "isRolling" BOOLEAN NOT NULL DEFAULT false,
    "status" "RoundStatus" NOT NULL DEFAULT 'UPCOMING',
    "applicationUrl" TEXT,
    "requiredDocuments" TEXT[],
    "process" TEXT,

    CONSTRAINT "application_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guides" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "resourceType" TEXT,
    "jurisdiction" TEXT NOT NULL DEFAULT 'Uganda',
    "responsibleAuthority" TEXT,
    "purpose" TEXT,
    "prerequisites" TEXT,
    "submissionChannel" TEXT,
    "expectedOutcome" TEXT,
    "issuingBody" TEXT,
    "publicationDate" TIMESTAMP(3),
    "effectiveDate" TIMESTAMP(3),
    "version" TEXT,
    "superseded" BOOLEAN NOT NULL DEFAULT false,
    "officialUrl" TEXT,
    "videoUrl" TEXT,
    "language" TEXT NOT NULL DEFAULT 'English',
    "practicalNotes" TEXT,
    "commonMistakes" TEXT,

    CONSTRAINT "guides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guide_steps" (
    "id" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "instruction" TEXT NOT NULL,
    "isOfficial" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "guide_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guide_documents" (
    "id" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "guide_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guide_fees" (
    "id" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(16,2),
    "currency" TEXT NOT NULL DEFAULT 'UGX',
    "feeBasis" TEXT,
    "processingTime" TEXT,
    "checkedAt" TIMESTAMP(3),
    "sourceId" TEXT,

    CONSTRAINT "guide_fees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investment_opportunities" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "opportunityType" TEXT,
    "promoter" TEXT,
    "promoterOrganizationId" TEXT,
    "sector" TEXT,
    "projectDescription" TEXT,
    "capitalSought" DECIMAL(18,2),
    "currency" TEXT NOT NULL DEFAULT 'UGX',
    "minimumParticipation" DECIMAL(18,2),
    "useOfFunds" TEXT,
    "investmentStructure" TEXT,
    "investorRights" TEXT,
    "revenueModel" TEXT,
    "term" TEXT,
    "exitArrangements" TEXT,
    "businessStage" TEXT,
    "financialEvidence" TEXT,
    "assumptions" TEXT,
    "risks" TEXT,
    "independentEvidence" TEXT,
    "opensAt" TIMESTAMP(3),
    "deadline" TIMESTAMP(3),
    "applicationProcess" TEXT,
    "requiredDocuments" TEXT[],
    "contactNotes" TEXT,
    "promoterReturnClaim" TEXT,
    "calculationBasis" TEXT,
    "claimVerificationStatus" TEXT,

    CONSTRAINT "investment_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultants" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "organizationId" TEXT,
    "fullName" TEXT NOT NULL,
    "professionalTitle" TEXT,
    "photoUrl" TEXT,
    "specialties" TEXT[],
    "languages" TEXT[],
    "deliveryModes" TEXT[],
    "experience" TEXT,
    "feeMin" DECIMAL(16,2),
    "feeMax" DECIMAL(16,2),
    "currency" TEXT NOT NULL DEFAULT 'UGX',
    "pricingBasis" TEXT,
    "consultationMins" INTEGER,
    "quotationRequired" BOOLEAN NOT NULL DEFAULT false,
    "availability" TEXT,
    "responseTime" TEXT,
    "bookingUrl" TEXT,

    CONSTRAINT "consultants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultant_projects" (
    "id" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "clientName" TEXT,
    "year" INTEGER,
    "summary" TEXT,
    "outcome" TEXT,
    "isCaseStudy" BOOLEAN NOT NULL DEFAULT false,
    "publicationPermitted" BOOLEAN NOT NULL DEFAULT false,
    "referenceContact" TEXT,

    CONSTRAINT "consultant_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultant_reviews" (
    "id" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "authorId" TEXT,
    "rating" INTEGER NOT NULL,
    "body" TEXT,
    "confirmedEngagement" BOOLEAN NOT NULL DEFAULT false,
    "engagementEvidence" TEXT,
    "moderation" "ReviewModeration" NOT NULL DEFAULT 'PENDING',
    "moderatedById" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consultant_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultant_qualifications" (
    "id" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "qualification" TEXT NOT NULL,
    "institution" TEXT,
    "professionalBody" TEXT,
    "registrationReference" TEXT,
    "year" INTEGER,

    CONSTRAINT "consultant_qualifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultant_services" (
    "id" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "deliverables" TEXT,
    "deliveryMode" TEXT,
    "coverage" TEXT,

    CONSTRAINT "consultant_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "cuisine" TEXT,
    "skillLevel" TEXT,
    "equipment" TEXT,
    "yieldQuantity" DECIMAL(12,3),
    "yieldUnit" TEXT,
    "servings" INTEGER,
    "prepMinutes" INTEGER,
    "cookMinutes" INTEGER,
    "allergens" TEXT[],
    "dietaryLabels" TEXT[],
    "storage" TEXT,
    "shelfLife" TEXT,
    "shelfLifeEvidence" TEXT,
    "videoUrl" TEXT,
    "videoDurationSec" INTEGER,
    "transcript" TEXT,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_ingredients" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "quantity" DECIMAL(12,3),
    "unit" TEXT,
    "prepNote" TEXT,
    "substitute" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_steps" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "instruction" TEXT NOT NULL,
    "durationMinutes" INTEGER,
    "temperatureC" INTEGER,
    "mediaUrl" TEXT,

    CONSTRAINT "recipe_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_costings" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "costedAt" TIMESTAMP(3) NOT NULL,
    "locationId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'UGX',
    "ingredientCost" DECIMAL(16,2),
    "packagingCost" DECIMAL(16,2),
    "energyCost" DECIMAL(16,2),
    "labourCost" DECIMAL(16,2),
    "wastagePercent" DECIMAL(5,2),
    "portionSize" TEXT,
    "portionsPerBatch" INTEGER,
    "sellingPrice" DECIMAL(16,2),
    "notes" TEXT,

    CONSTRAINT "recipe_costings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_costing_lines" (
    "id" TEXT NOT NULL,
    "costingId" TEXT NOT NULL,
    "ingredientId" TEXT,
    "description" TEXT NOT NULL,
    "quantityUsed" DECIMAL(12,3) NOT NULL,
    "usedUnit" TEXT NOT NULL,
    "purchaseUnit" TEXT,
    "unitPrice" DECIMAL(16,2),
    "conversionFactor" DECIMAL(12,6),
    "unknownReason" TEXT,
    "sourceId" TEXT,

    CONSTRAINT "recipe_costing_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tools" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "toolType" "ToolType" NOT NULL,
    "purpose" TEXT,
    "intendedUser" TEXT,
    "requiredInputs" TEXT,
    "usageSteps" TEXT,
    "workedExample" TEXT,
    "limitations" TEXT,
    "fileFormat" TEXT,
    "supportedSoftware" TEXT,
    "editable" BOOLEAN,
    "hasMacros" BOOLEAN,
    "calculatorRoute" TEXT,
    "jurisdiction" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "ruleSourceUrl" TEXT,
    "licence" TEXT,
    "publisher" TEXT,

    CONSTRAINT "tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_versions" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "versionNumber" TEXT NOT NULL,
    "releasedAt" TIMESTAMP(3) NOT NULL,
    "changeNotes" TEXT,
    "superseded" BOOLEAN NOT NULL DEFAULT false,
    "fileUrl" TEXT,
    "ruleDefinition" JSONB,

    CONSTRAINT "tool_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_calculations" (
    "id" TEXT NOT NULL,
    "toolVersionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT,
    "inputs" JSONB NOT NULL,
    "outputs" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tool_calculations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_test_cases" (
    "id" TEXT NOT NULL,
    "toolVersionId" TEXT NOT NULL,
    "inputs" JSONB NOT NULL,
    "expectedOutput" JSONB NOT NULL,
    "lastValidatedAt" TIMESTAMP(3),
    "validatorId" TEXT,

    CONSTRAINT "tool_test_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "markets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "marketType" TEXT,
    "locationId" TEXT,
    "town" TEXT,
    "address" TEXT,
    "operatingDays" TEXT,
    "contact" TEXT,

    CONSTRAINT "markets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_observations" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "collectedAt" TIMESTAMP(3),
    "priceMin" DECIMAL(16,2),
    "priceMax" DECIMAL(16,2),
    "currency" TEXT NOT NULL DEFAULT 'UGX',
    "quotedUnit" TEXT NOT NULL,
    "quantityBasis" DECIMAL(12,3),
    "priceType" "PriceType" NOT NULL,
    "productCondition" TEXT,
    "grade" TEXT,
    "packageSize" TEXT,
    "conversionFactor" DECIMAL(12,6),
    "includesTax" BOOLEAN,
    "includesTransport" BOOLEAN,
    "sourceId" TEXT,
    "collectionMethod" TEXT,
    "quoteCount" INTEGER,
    "collectorId" TEXT,
    "verificationResult" "CheckResult" NOT NULL DEFAULT 'NOT_CHECKED',
    "notes" TEXT,
    "status" "PublicationStatus" NOT NULL DEFAULT 'IN_REVIEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "useful_websites" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "canonicalUrl" TEXT NOT NULL,
    "operator" TEXT,
    "siteType" TEXT,
    "mainFunction" TEXT,
    "resources" TEXT,
    "useCase" TEXT,
    "countries" TEXT[],
    "languages" TEXT[],
    "accessCost" "AccessCost",
    "pricingUrl" TEXT,
    "accountRequired" BOOLEAN,
    "restrictions" TEXT,
    "officialSite" BOOLEAN,
    "ownershipEvidence" TEXT,
    "editorialAssessment" TEXT,
    "lastContentReviewAt" TIMESTAMP(3),
    "availabilityStatus" TEXT,
    "lastLinkCheckAt" TIMESTAMP(3),
    "linkStatus" INTEGER,
    "redirectUrl" TEXT,
    "isAffiliate" BOOLEAN NOT NULL DEFAULT false,
    "disclosure" TEXT,

    CONSTRAINT "useful_websites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_articles" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "standfirst" TEXT,
    "body" TEXT,
    "articleType" "ArticleType" NOT NULL DEFAULT 'NEWS',
    "author" TEXT,
    "publisher" TEXT,
    "originalUrl" TEXT,
    "eventDate" TIMESTAMP(3),
    "effectiveDate" TIMESTAMP(3),
    "whatChanged" TEXT,
    "whoAffected" TEXT,
    "nextAction" TEXT,
    "correctionStatus" TEXT,
    "updateNotes" TEXT,
    "imageCredit" TEXT,
    "sourceLinks" TEXT[],

    CONSTRAINT "news_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_organizations" (
    "newsId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "news_organizations_pkey" PRIMARY KEY ("newsId","organizationId")
);

-- CreateTable
CREATE TABLE "membership_plans" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "audience" "PlanAudience" NOT NULL,
    "priceMonthly" DECIMAL(14,2),
    "priceYearly" DECIMAL(14,2),
    "currency" TEXT NOT NULL DEFAULT 'UGX',
    "entitlements" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "membership_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "organizationId" TEXT,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "period" "BillingPeriod" NOT NULL DEFAULT 'MONTHLY',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UGX',
    "method" "PaymentMethod" NOT NULL,
    "providerRef" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_items" (
    "userId" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_items_pkey" PRIMARY KEY ("userId","contentItemId")
);

-- CreateTable
CREATE TABLE "collections" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_items" (
    "collectionId" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "note" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_items_pkey" PRIMARY KEY ("collectionId","contentItemId")
);

-- CreateTable
CREATE TABLE "saved_searches" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "filters" JSONB,
    "alert" BOOLEAN NOT NULL DEFAULT false,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" TEXT NOT NULL,
    "type" "SubmissionType" NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "contentItemId" TEXT,
    "organizationId" TEXT,
    "supplierOfferId" TEXT,
    "priceObservationId" TEXT,
    "roundId" TEXT,
    "payload" JSONB,
    "submittedById" TEXT,
    "assignedToId" TEXT,
    "decisionNote" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "correction_reports" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "reporterId" TEXT,
    "reporterEmail" TEXT,
    "message" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "decisionNote" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "correction_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_events" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT,
    "correctionReportId" TEXT,
    "actorId" TEXT,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "AlertKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "contentItemId" TEXT,
    "savedSearchId" TEXT,
    "readAt" TIMESTAMP(3),
    "emailedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "event" TEXT NOT NULL,
    "contentItemId" TEXT,
    "path" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "uploadedById" TEXT,
    "purpose" TEXT NOT NULL,
    "fileLocation" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enquiries" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "contentItemId" TEXT,
    "fromUserId" TEXT,
    "message" TEXT NOT NULL,
    "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_reveals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_reveals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "query" TEXT NOT NULL,
    "filters" JSONB,
    "resultsCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "organizations_status_idx" ON "organizations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "locations_name_type_parentId_key" ON "locations"("name", "type", "parentId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_kind_slug_key" ON "categories"("kind", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "content_items_slug_key" ON "content_items"("slug");

-- CreateIndex
CREATE INDEX "content_items_contentType_publicationStatus_idx" ON "content_items"("contentType", "publicationStatus");

-- CreateIndex
CREATE INDEX "content_items_nextReviewDueAt_idx" ON "content_items"("nextReviewDueAt");

-- CreateIndex
CREATE UNIQUE INDEX "audiences_slug_key" ON "audiences"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "file_versions_mediaAssetId_versionLabel_key" ON "file_versions"("mediaAssetId", "versionLabel");

-- CreateIndex
CREATE INDEX "verification_checks_contentItemId_checkType_idx" ON "verification_checks"("contentItemId", "checkType");

-- CreateIndex
CREATE UNIQUE INDEX "business_ideas_contentItemId_key" ON "business_ideas"("contentItemId");

-- CreateIndex
CREATE UNIQUE INDEX "idea_steps_ideaId_stepNumber_key" ON "idea_steps"("ideaId", "stepNumber");

-- CreateIndex
CREATE UNIQUE INDEX "budget_scenarios_ideaId_level_key" ON "budget_scenarios"("ideaId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "machines_contentItemId_key" ON "machines"("contentItemId");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_contentItemId_key" ON "suppliers"("contentItemId");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_organizationId_key" ON "suppliers"("organizationId");

-- CreateIndex
CREATE INDEX "supplier_offers_machineId_status_idx" ON "supplier_offers"("machineId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "products_name_variety_grade_key" ON "products"("name", "variety", "grade");

-- CreateIndex
CREATE UNIQUE INDEX "funding_providers_organizationId_key" ON "funding_providers"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "funding_programmes_contentItemId_key" ON "funding_programmes"("contentItemId");

-- CreateIndex
CREATE INDEX "funding_programmes_fundingType_idx" ON "funding_programmes"("fundingType");

-- CreateIndex
CREATE INDEX "application_rounds_status_closesAt_idx" ON "application_rounds"("status", "closesAt");

-- CreateIndex
CREATE UNIQUE INDEX "guides_contentItemId_key" ON "guides"("contentItemId");

-- CreateIndex
CREATE UNIQUE INDEX "guide_steps_guideId_stepNumber_key" ON "guide_steps"("guideId", "stepNumber");

-- CreateIndex
CREATE UNIQUE INDEX "investment_opportunities_contentItemId_key" ON "investment_opportunities"("contentItemId");

-- CreateIndex
CREATE INDEX "investment_opportunities_deadline_idx" ON "investment_opportunities"("deadline");

-- CreateIndex
CREATE UNIQUE INDEX "consultants_contentItemId_key" ON "consultants"("contentItemId");

-- CreateIndex
CREATE INDEX "consultant_reviews_consultantId_moderation_idx" ON "consultant_reviews"("consultantId", "moderation");

-- CreateIndex
CREATE UNIQUE INDEX "recipes_contentItemId_key" ON "recipes"("contentItemId");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_steps_recipeId_stepNumber_key" ON "recipe_steps"("recipeId", "stepNumber");

-- CreateIndex
CREATE UNIQUE INDEX "tools_contentItemId_key" ON "tools"("contentItemId");

-- CreateIndex
CREATE UNIQUE INDEX "tool_versions_toolId_versionNumber_key" ON "tool_versions"("toolId", "versionNumber");

-- CreateIndex
CREATE INDEX "tool_calculations_userId_createdAt_idx" ON "tool_calculations"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "price_observations_productId_marketId_observedAt_idx" ON "price_observations"("productId", "marketId", "observedAt");

-- CreateIndex
CREATE UNIQUE INDEX "useful_websites_contentItemId_key" ON "useful_websites"("contentItemId");

-- CreateIndex
CREATE UNIQUE INDEX "news_articles_contentItemId_key" ON "news_articles"("contentItemId");

-- CreateIndex
CREATE UNIQUE INDEX "membership_plans_code_key" ON "membership_plans"("code");

-- CreateIndex
CREATE INDEX "subscriptions_userId_status_idx" ON "subscriptions"("userId", "status");

-- CreateIndex
CREATE INDEX "submissions_status_type_createdAt_idx" ON "submissions"("status", "type", "createdAt");

-- CreateIndex
CREATE INDEX "correction_reports_status_createdAt_idx" ON "correction_reports"("status", "createdAt");

-- CreateIndex
CREATE INDEX "moderation_events_submissionId_idx" ON "moderation_events"("submissionId");

-- CreateIndex
CREATE INDEX "moderation_events_correctionReportId_idx" ON "moderation_events"("correctionReportId");

-- CreateIndex
CREATE INDEX "alerts_userId_readAt_idx" ON "alerts"("userId", "readAt");

-- CreateIndex
CREATE INDEX "usage_events_event_createdAt_idx" ON "usage_events"("event", "createdAt");

-- CreateIndex
CREATE INDEX "usage_events_contentItemId_idx" ON "usage_events"("contentItemId");

-- CreateIndex
CREATE INDEX "contact_reveals_organizationId_createdAt_idx" ON "contact_reveals"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_categories" ADD CONSTRAINT "organization_categories_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_categories" ADD CONSTRAINT "organization_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_locations" ADD CONSTRAINT "organization_locations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_locations" ADD CONSTRAINT "organization_locations_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "consultants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_primaryCategoryId_fkey" FOREIGN KEY ("primaryCategoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_categories" ADD CONSTRAINT "content_categories_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "content_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_categories" ADD CONSTRAINT "content_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_locations" ADD CONSTRAINT "content_locations_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "content_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_locations" ADD CONSTRAINT "content_locations_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_audiences" ADD CONSTRAINT "content_audiences_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "content_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_audiences" ADD CONSTRAINT "content_audiences_audienceId_fkey" FOREIGN KEY ("audienceId") REFERENCES "audiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_entitlements" ADD CONSTRAINT "content_entitlements_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "content_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_links" ADD CONSTRAINT "evidence_links_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "content_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_links" ADD CONSTRAINT "evidence_links_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "content_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_ownerOrganizationId_fkey" FOREIGN KEY ("ownerOrganizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_versions" ADD CONSTRAINT "file_versions_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "media_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_versions" ADD CONSTRAINT "file_versions_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_checks" ADD CONSTRAINT "verification_checks_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "content_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_checks" ADD CONSTRAINT "verification_checks_checkedById_fkey" FOREIGN KEY ("checkedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "related_content" ADD CONSTRAINT "related_content_fromItemId_fkey" FOREIGN KEY ("fromItemId") REFERENCES "content_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "related_content" ADD CONSTRAINT "related_content_toItemId_fkey" FOREIGN KEY ("toItemId") REFERENCES "content_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "content_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_ideas" ADD CONSTRAINT "business_ideas_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "content_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idea_steps" ADD CONSTRAINT "idea_steps_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "business_ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_scenarios" ADD CONSTRAINT "budget_scenarios_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "business_ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_scenarios" ADD CONSTRAINT "budget_scenarios_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "budget_scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machines" ADD CONSTRAINT "machines_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "content_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "content_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_offers" ADD CONSTRAINT "supplier_offers_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "machines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_offers" ADD CONSTRAINT "supplier_offers_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_product_listings" ADD CONSTRAINT "supplier_product_listings_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_product_listings" ADD CONSTRAINT "supplier_product_listings_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funding_providers" ADD CONSTRAINT "funding_providers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funding_programmes" ADD CONSTRAINT "funding_programmes_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "content_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funding_programmes" ADD CONSTRAINT "funding_programmes_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "funding_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_rounds" ADD CONSTRAINT "application_rounds_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "funding_programmes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guides" ADD CONSTRAINT "guides_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "content_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_steps" ADD CONSTRAINT "guide_steps_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "guides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_documents" ADD CONSTRAINT "guide_documents_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "guides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_fees" ADD CONSTRAINT "guide_fees_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "guides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_fees" ADD CONSTRAINT "guide_fees_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_opportunities" ADD CONSTRAINT "investment_opportunities_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "content_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_opportunities" ADD CONSTRAINT "investment_opportunities_promoterOrganizationId_fkey" FOREIGN KEY ("promoterOrganizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultants" ADD CONSTRAINT "consultants_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "content_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultants" ADD CONSTRAINT "consultants_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultant_projects" ADD CONSTRAINT "consultant_projects_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "consultants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultant_reviews" ADD CONSTRAINT "consultant_reviews_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "consultants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultant_reviews" ADD CONSTRAINT "consultant_reviews_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultant_reviews" ADD CONSTRAINT "consultant_reviews_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultant_qualifications" ADD CONSTRAINT "consultant_qualifications_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "consultants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultant_services" ADD CONSTRAINT "consultant_services_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "consultants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "content_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_steps" ADD CONSTRAINT "recipe_steps_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_costings" ADD CONSTRAINT "recipe_costings_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_costings" ADD CONSTRAINT "recipe_costings_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_costing_lines" ADD CONSTRAINT "recipe_costing_lines_costingId_fkey" FOREIGN KEY ("costingId") REFERENCES "recipe_costings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_costing_lines" ADD CONSTRAINT "recipe_costing_lines_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "recipe_ingredients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_costing_lines" ADD CONSTRAINT "recipe_costing_lines_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tools" ADD CONSTRAINT "tools_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "content_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_versions" ADD CONSTRAINT "tool_versions_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_calculations" ADD CONSTRAINT "tool_calculations_toolVersionId_fkey" FOREIGN KEY ("toolVersionId") REFERENCES "tool_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_calculations" ADD CONSTRAINT "tool_calculations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_test_cases" ADD CONSTRAINT "tool_test_cases_toolVersionId_fkey" FOREIGN KEY ("toolVersionId") REFERENCES "tool_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_test_cases" ADD CONSTRAINT "tool_test_cases_validatorId_fkey" FOREIGN KEY ("validatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "markets" ADD CONSTRAINT "markets_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_observations" ADD CONSTRAINT "price_observations_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "markets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_observations" ADD CONSTRAINT "price_observations_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_observations" ADD CONSTRAINT "price_observations_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_observations" ADD CONSTRAINT "price_observations_collectorId_fkey" FOREIGN KEY ("collectorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "useful_websites" ADD CONSTRAINT "useful_websites_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "content_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_articles" ADD CONSTRAINT "news_articles_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "content_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_organizations" ADD CONSTRAINT "news_organizations_newsId_fkey" FOREIGN KEY ("newsId") REFERENCES "news_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_organizations" ADD CONSTRAINT "news_organizations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "membership_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_items" ADD CONSTRAINT "saved_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_items" ADD CONSTRAINT "saved_items_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "content_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "content_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "content_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_supplierOfferId_fkey" FOREIGN KEY ("supplierOfferId") REFERENCES "supplier_offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_priceObservationId_fkey" FOREIGN KEY ("priceObservationId") REFERENCES "price_observations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "application_rounds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correction_reports" ADD CONSTRAINT "correction_reports_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "content_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correction_reports" ADD CONSTRAINT "correction_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correction_reports" ADD CONSTRAINT "correction_reports_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_events" ADD CONSTRAINT "moderation_events_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_events" ADD CONSTRAINT "moderation_events_correctionReportId_fkey" FOREIGN KEY ("correctionReportId") REFERENCES "correction_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_events" ADD CONSTRAINT "moderation_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "content_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_savedSearchId_fkey" FOREIGN KEY ("savedSearchId") REFERENCES "saved_searches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "content_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_reveals" ADD CONSTRAINT "contact_reveals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_reveals" ADD CONSTRAINT "contact_reveals_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

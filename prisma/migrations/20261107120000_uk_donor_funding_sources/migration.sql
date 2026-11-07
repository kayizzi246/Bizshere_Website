-- The client's request (7 Nov 2026): replace every Funding Source with their list of 20 UK donor
-- organisations ("Grants & Funding for Projects in Uganda"). Runs once, like every migration.
-- The same change as scripts/replace-funding-sources.mjs. Investment opportunities are not touched.

-- 1. The fund providers behind today's funding sources, and their organisations
CREATE TEMP TABLE old_providers ON COMMIT DROP AS
  SELECT DISTINCT fp."providerId" AS id, p."organizationId" AS org
  FROM "funding_programmes" fp JOIN "funding_providers" p ON p."id" = fp."providerId";

-- 2. Every funding source page (its programme details go with it)
DELETE FROM "content_items" WHERE "contentType" = 'FUNDING_PROGRAMME';

-- 3. Those providers, now with no programme, and their organisations when nothing else uses them
DELETE FROM "funding_providers" WHERE "id" IN (SELECT id FROM old_providers)
  AND NOT EXISTS (SELECT 1 FROM "funding_programmes" x WHERE x."providerId" = "funding_providers"."id");
DELETE FROM "organizations" o
WHERE o."id" IN (SELECT org FROM old_providers)
  AND o."accountType" = 'FUNDING_PROVIDER'
  AND NOT EXISTS (SELECT 1 FROM "funding_providers" x WHERE x."organizationId" = o."id")
  AND NOT EXISTS (SELECT 1 FROM "suppliers" x WHERE x."organizationId" = o."id")
  AND NOT EXISTS (SELECT 1 FROM "organization_members" x WHERE x."organizationId" = o."id")
  AND NOT EXISTS (SELECT 1 FROM "consultants" x WHERE x."organizationId" = o."id")
  AND NOT EXISTS (SELECT 1 FROM "subscriptions" x WHERE x."organizationId" = o."id")
  AND NOT EXISTS (SELECT 1 FROM "documents" x WHERE x."organizationId" = o."id")
  AND NOT EXISTS (SELECT 1 FROM "enquiries" x WHERE x."organizationId" = o."id")
  AND NOT EXISTS (SELECT 1 FROM "submissions" x WHERE x."organizationId" = o."id")
  AND NOT EXISTS (SELECT 1 FROM "investment_opportunities" x WHERE x."promoterOrganizationId" = o."id");

-- 4. The 20 donors: name, focus area, website, and a category from the list's own headings
CREATE TEMP TABLE donors ON COMMIT DROP AS
SELECT v.*, gen_random_uuid()::text AS org_id, gen_random_uuid()::text AS provider_id,
       gen_random_uuid()::text AS item_id, gen_random_uuid()::text AS programme_id,
       trim(both '-' from regexp_replace(lower(replace(v.name, '&', 'and')), '[^a-z0-9]+', '-', 'g')) AS base_slug
FROM (VALUES
  (1, 'Comic Relief', 'Poverty reduction & health', 'https://www.comicrelief.com', 'Community development'),
  (2, 'British International Investment', 'Private sector & business', 'https://www.bii.co.uk', 'Business'),
  (3, 'British Council', 'Education & culture', 'https://www.britishcouncil.org', 'Education'),
  (4, 'The National Lottery Community Fund', 'Communities & social projects', 'https://www.tnlcommunityfund.org.uk', 'Community development'),
  (5, 'Global Innovation Fund', 'Innovation & development', 'https://www.globalinnovation.fund', 'Business'),
  (6, 'Charles Hayward Foundation', 'Health & social welfare', 'https://www.charleshaywardfoundation.org.uk', 'Health'),
  (7, 'Global Fund for Children', 'Children & youth', 'https://www.globalfundforchildren.org', 'Children & youth'),
  (8, 'Oxfam GB', 'Poverty & humanitarian aid', 'https://www.oxfam.org.uk', 'Community development'),
  (9, 'Sightsavers', 'Blindness & neglected diseases', 'https://www.sightsavers.org', 'Health'),
  (10, 'WaterAid', 'Clean water & hygiene', 'https://www.wateraid.org', 'Health'),
  (11, 'Plan International UK', 'Children & gender equality', 'https://www.plan-uk.org', 'Children & youth'),
  (12, 'CAFOD', 'Development & humanitarian aid', 'https://www.cafod.org.uk', 'Community development'),
  (13, 'Caritas Westminster', 'Social action & charity', 'https://www.caritaswestminster.org.uk', 'Community development'),
  (14, 'Save the Children UK', 'Children''s rights & welfare', 'https://www.savethechildren.org.uk', 'Children & youth'),
  (15, 'UNICEF UK', 'Children''s rights & development', 'https://www.unicef.org.uk', 'Children & youth'),
  (16, 'The Leprosy Mission UK', 'Leprosy & disability support', 'https://www.leprosymission.org.uk', 'Health'),
  (17, 'ActionAid UK', 'Rights & poverty reduction', 'https://www.actionaid.org.uk', 'Community development'),
  (18, 'Marie Stopes International', 'Reproductive health', 'https://www.mariestopes.org.uk', 'Health'),
  (19, 'The Prince''s Trust', 'Youth & skills development', 'https://www.princes-trust.org.uk', 'Education'),
  (20, 'Concern Worldwide UK', 'Humanitarian & development', 'https://www.concern.net', 'Community development')
) AS v(n, name, focus, website, category);

-- Funding's categories are industries: add any of the five that aren't there yet (an existing one is reused)
INSERT INTO "categories" ("id", "name", "slug", "kind")
SELECT gen_random_uuid()::text, c.category, trim(both '-' from regexp_replace(lower(replace(c.category, '&', 'and')), '[^a-z0-9]+', '-', 'g')), 'INDUSTRY'
FROM (SELECT DISTINCT category FROM donors) c
WHERE NOT EXISTS (SELECT 1 FROM "categories" k WHERE k."kind" = 'INDUSTRY' AND lower(k."name") = lower(c.category))
ON CONFLICT ("kind", "slug") DO NOTHING;

INSERT INTO "organizations" ("id", "legalName", "accountType", "status", "website", "description", "createdAt", "updatedAt")
SELECT org_id, name, 'FUNDING_PROVIDER', 'ACTIVE', website, 'UK donor organisation. Focus: ' || focus || '.', NOW(), NOW() FROM donors;

INSERT INTO "funding_providers" ("id", "organizationId", "providerCategory", "country")
SELECT provider_id, org_id, 'UK donor', 'United Kingdom' FROM donors;

INSERT INTO "content_items" ("id", "contentType", "title", "slug", "shortSummary", "overview", "primaryCategoryId",
  "publicationStatus", "accessLevel", "publishedAt", "lastReviewedAt", "createdAt", "updatedAt")
SELECT d.item_id, 'FUNDING_PROGRAMME', d.name,
  -- a web address another page already uses gets "-fund" added
  CASE WHEN EXISTS (SELECT 1 FROM "content_items" x WHERE x."slug" = d.base_slug) THEN d.base_slug || '-fund' ELSE d.base_slug END,
  d.focus,
  d.name || ' is a UK donor organisation that gives grants. Focus: ' || d.focus || '. Check its website for open calls, who can apply in Uganda, and how to apply.',
  (SELECT k."id" FROM "categories" k WHERE k."kind" = 'INDUSTRY' AND (lower(k."name") = lower(d.category)
     OR k."slug" = trim(both '-' from regexp_replace(lower(replace(d.category, '&', 'and')), '[^a-z0-9]+', '-', 'g')))
   ORDER BY (lower(k."name") = lower(d.category)) DESC LIMIT 1),
  'PUBLISHED', 'PREVIEW', NOW() - (d.n || ' seconds')::interval, NOW(), NOW(), NOW()
FROM donors d;

INSERT INTO "funding_programmes" ("id", "contentItemId", "providerId", "providerCategory", "fundingType", "purpose", "officialTermsUrl", "termsLastCheckedAt", "currency")
SELECT programme_id, item_id, provider_id, focus, 'GRANT', focus, website, NOW(), 'UGX' FROM donors;

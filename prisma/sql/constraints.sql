-- BizSphere-Ug: extra database rules that Prisma's schema language can't express.
-- Run after the first migration:   npm run db:constraints
-- Safe to run more than once.

-- Helper: add a CHECK constraint only if it doesn't exist yet
CREATE OR REPLACE FUNCTION bsu_add_check(tbl text, cname text, expr text) RETURNS void AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = cname) THEN
    EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I CHECK (%s)', tbl, cname, expr);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Minimum never above maximum; no negative money
SELECT bsu_add_check('supplier_offers', 'offer_price_range', '"priceMin" IS NULL OR "priceMax" IS NULL OR "priceMin" <= "priceMax"');
SELECT bsu_add_check('supplier_offers', 'offer_price_positive', '("priceMin" IS NULL OR "priceMin" >= 0) AND ("priceMax" IS NULL OR "priceMax" >= 0)');
SELECT bsu_add_check('supplier_offers', 'offer_quote_dates', '"quotedAt" IS NULL OR "validUntil" IS NULL OR "quotedAt" <= "validUntil"');
SELECT bsu_add_check('supplier_offers', 'offer_warranty_positive', '"warrantyMonths" IS NULL OR "warrantyMonths" >= 0');

SELECT bsu_add_check('supplier_product_listings', 'listing_price_range', '"priceMin" IS NULL OR "priceMax" IS NULL OR "priceMin" <= "priceMax"');

SELECT bsu_add_check('price_observations', 'obs_price_range', '"priceMin" IS NULL OR "priceMax" IS NULL OR "priceMin" <= "priceMax"');
SELECT bsu_add_check('price_observations', 'obs_price_positive', '("priceMin" IS NULL OR "priceMin" >= 0) AND ("priceMax" IS NULL OR "priceMax" >= 0)');
SELECT bsu_add_check('price_observations', 'obs_quote_count', '"quoteCount" IS NULL OR "quoteCount" >= 0');

SELECT bsu_add_check('funding_programmes', 'funding_amount_range', '"amountMin" IS NULL OR "amountMax" IS NULL OR "amountMin" <= "amountMax"');
SELECT bsu_add_check('funding_programmes', 'funding_rate_positive', '"interestRate" IS NULL OR "interestRate" >= 0');
SELECT bsu_add_check('application_rounds', 'round_dates', '"opensAt" IS NULL OR "closesAt" IS NULL OR "opensAt" <= "closesAt"');

SELECT bsu_add_check('consultants', 'consultant_fee_range', '"feeMin" IS NULL OR "feeMax" IS NULL OR "feeMin" <= "feeMax"');
SELECT bsu_add_check('machines', 'machine_capacity_range', '"capacityMin" IS NULL OR "capacityMax" IS NULL OR "capacityMin" <= "capacityMax"');

SELECT bsu_add_check('budget_lines', 'budget_line_quantity', '"quantity" >= 0');
SELECT bsu_add_check('budget_lines', 'budget_line_cost', '"unitCost" IS NULL OR "unitCost" >= 0');
-- An unsourced cost must say why it is missing
SELECT bsu_add_check('budget_lines', 'budget_line_unknown_reason', '"unitCost" IS NOT NULL OR "unknownReason" IS NOT NULL');

SELECT bsu_add_check('recipe_ingredients', 'recipe_qty_positive', '"quantity" IS NULL OR "quantity" >= 0');
SELECT bsu_add_check('recipe_costing_lines', 'recipe_cost_qty', '"quantityUsed" >= 0');
SELECT bsu_add_check('recipe_costing_lines', 'recipe_cost_price', '"unitPrice" IS NULL OR "unitPrice" >= 0');
SELECT bsu_add_check('recipe_costing_lines', 'recipe_cost_conversion', '"conversionFactor" IS NULL OR "conversionFactor" > 0');
SELECT bsu_add_check('recipe_costing_lines', 'recipe_cost_unknown_reason', '"unitPrice" IS NOT NULL OR "unknownReason" IS NOT NULL');
SELECT bsu_add_check('recipe_costings', 'recipe_wastage_pct', '"wastagePercent" IS NULL OR ("wastagePercent" >= 0 AND "wastagePercent" <= 100)');
SELECT bsu_add_check('recipe_costings', 'recipe_portions', '"portionsPerBatch" IS NULL OR "portionsPerBatch" > 0');

SELECT bsu_add_check('investment_opportunities', 'opp_capital_positive', '("capitalSought" IS NULL OR "capitalSought" >= 0) AND ("minimumParticipation" IS NULL OR "minimumParticipation" >= 0)');
SELECT bsu_add_check('investment_opportunities', 'opp_min_le_capital', '"capitalSought" IS NULL OR "minimumParticipation" IS NULL OR "minimumParticipation" <= "capitalSought"');
SELECT bsu_add_check('investment_opportunities', 'opp_dates', '"opensAt" IS NULL OR "deadline" IS NULL OR "opensAt" <= "deadline"');

SELECT bsu_add_check('consultant_reviews', 'review_rating_range', '"rating" BETWEEN 1 AND 5');
SELECT bsu_add_check('guide_fees', 'guide_fee_positive', '"amount" IS NULL OR "amount" >= 0');
SELECT bsu_add_check('membership_plans', 'plan_price_positive', '("priceMonthly" IS NULL OR "priceMonthly" >= 0) AND ("priceYearly" IS NULL OR "priceYearly" >= 0)');
SELECT bsu_add_check('payments', 'payment_amount_positive', '"amount" >= 0');
SELECT bsu_add_check('units', 'unit_to_base_positive', '"toBase" IS NULL OR "toBase" > 0');

-- Currencies are ISO 4217 codes (UGX, USD, KES...)
SELECT bsu_add_check('supplier_offers', 'offer_currency_iso', '"currency" ~ ''^[A-Z]{3}$''');
SELECT bsu_add_check('supplier_product_listings', 'listing_currency_iso', '"currency" ~ ''^[A-Z]{3}$''');
SELECT bsu_add_check('price_observations', 'obs_currency_iso', '"currency" ~ ''^[A-Z]{3}$''');
SELECT bsu_add_check('funding_programmes', 'funding_currency_iso', '"currency" ~ ''^[A-Z]{3}$''');
SELECT bsu_add_check('budget_scenarios', 'scenario_currency_iso', '"currency" ~ ''^[A-Z]{3}$''');
SELECT bsu_add_check('recipe_costings', 'costing_currency_iso', '"currency" ~ ''^[A-Z]{3}$''');
SELECT bsu_add_check('investment_opportunities', 'opp_currency_iso', '"currency" ~ ''^[A-Z]{3}$''');
SELECT bsu_add_check('consultants', 'consultant_currency_iso', '"currency" ~ ''^[A-Z]{3}$''');

-- A related-content link never points at itself
SELECT bsu_add_check('related_content', 'related_not_self', '"fromItemId" <> "toItemId"');

DROP FUNCTION bsu_add_check(text, text, text);

-- Full-text search across all directories (used by /search)
CREATE INDEX IF NOT EXISTS content_items_search_idx ON content_items USING GIN (
  to_tsvector('english', coalesce("title", '') || ' ' || coalesce("shortSummary", '') || ' ' || coalesce("overview", ''))
);

-- Case-insensitive lookups for duplicate checks on business sign-up
CREATE INDEX IF NOT EXISTS organizations_legal_name_lower_idx ON organizations (lower("legalName"));

-- Only one current version per downloadable file
CREATE UNIQUE INDEX IF NOT EXISTS file_versions_one_current_idx ON file_versions ("mediaAssetId") WHERE "isCurrent";

-- Only one primary location per organization
CREATE UNIQUE INDEX IF NOT EXISTS organization_locations_one_primary_idx ON organization_locations ("organizationId") WHERE "isPrimary";

-- Funder category becomes a fixed list (client, 25 Nov 2026; src/lib/content-fields.ts FUNDER_CATEGORIES).
-- No column changes: "providerCategory" stays TEXT on both tables. This moves the free text typed so far onto the
-- list, by keyword, so the Category filter on /funding groups like with like and the admin dropdown shows the value.

CREATE OR REPLACE FUNCTION pg_temp.funder_category(v TEXT) RETURNS TEXT AS $$
  SELECT CASE
    WHEN v IS NULL OR btrim(v) = '' THEN NULL
    WHEN v IN ('Government programme', 'Development bank', 'Commercial bank', 'Microfinance institution', 'SACCO', 'Money lender',
               'Digital lender', 'Development partner or donor', 'NGO or foundation', 'Investor', 'Other') THEN v
    WHEN lower(v) LIKE '%development bank%' THEN 'Development bank'
    WHEN lower(v) LIKE '%micro%' OR v ~* '\mmdi\M' THEN 'Microfinance institution'
    WHEN lower(v) LIKE '%sacco%' OR lower(v) LIKE '%co-operative%' OR lower(v) LIKE '%cooperative%' THEN 'SACCO'
    WHEN lower(v) LIKE '%money lend%' OR lower(v) LIKE '%moneylend%' THEN 'Money lender'
    WHEN lower(v) LIKE '%digital%' OR lower(v) LIKE '%mobile%' OR lower(v) LIKE '%fintech%' THEN 'Digital lender'
    WHEN lower(v) LIKE '%bank%' THEN 'Commercial bank'
    WHEN lower(v) LIKE '%donor%' OR lower(v) LIKE '%development fund%' OR lower(v) LIKE '%development partner%' THEN 'Development partner or donor'
    WHEN v ~* '\mngos?\M' OR lower(v) LIKE '%foundation%' OR lower(v) LIKE '%charit%' THEN 'NGO or foundation'
    WHEN lower(v) LIKE '%invest%' OR lower(v) LIKE '%equity%' OR lower(v) LIKE '%venture%' OR lower(v) LIKE '%angel%' THEN 'Investor'
    WHEN lower(v) LIKE '%government%' OR lower(v) LIKE '%ministry%' OR lower(v) LIKE '%agency%' OR lower(v) LIKE '%public%' THEN 'Government programme'
    ELSE NULL
  END
$$ LANGUAGE sql IMMUTABLE;

-- Funds first, while each funder still holds what was typed for it. A fund of a donor funder (the UK donors held
-- their focus, a sector such as "Social action & charity", in this field) is cleared, so it shows the funder's
-- category. Any other fund: a recognised value moves onto the list; anything else is cleared when the funder has a
-- category, or becomes Other when it has none.
UPDATE "funding_programmes" fp
SET "providerCategory" = CASE
  WHEN lower(coalesce(pv."providerCategory", '')) LIKE '%donor%' THEN NULL
  WHEN pg_temp.funder_category(fp."providerCategory") IS NOT NULL THEN pg_temp.funder_category(fp."providerCategory")
  WHEN pv."providerCategory" IS NOT NULL AND btrim(pv."providerCategory") <> '' THEN NULL
  ELSE 'Other'
END
FROM "funding_providers" pv
WHERE pv."id" = fp."providerId" AND fp."providerCategory" IS NOT NULL AND btrim(fp."providerCategory") <> '';

-- Then the funders: what a fund falls back to
UPDATE "funding_providers"
SET "providerCategory" = COALESCE(pg_temp.funder_category("providerCategory"), 'Other')
WHERE "providerCategory" IS NOT NULL AND btrim("providerCategory") <> '';

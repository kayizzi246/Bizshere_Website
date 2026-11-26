-- Every fund shows a funder category (client, 26 Nov 2026: "make sure it shows on the all site front end and admin
-- because the truth am not seeing it"). 20261125120000_funder_category only moved categories that had been typed;
-- funders with none stayed empty, so nothing showed. This fills them from the funder's name, by keyword (the same
-- list as guessFunderCategory in src/lib/content-fields.ts), Other when nothing fits, then gives every fund without
-- its own category its funder's, so the admin form, the admin list and the /funding filter all see it.
-- Only empty values are filled: nothing chosen by hand changes.

CREATE OR REPLACE FUNCTION pg_temp.guess_funder(n TEXT) RETURNS TEXT AS $$
  SELECT CASE
    WHEN n IS NULL OR btrim(n) = '' THEN NULL
    WHEN n ~* '(world bank|\mundp\M|\mgiz\M|\musaid\M|\municef\M|\mfao\M|\mifad\M|\mjica\M|\mkfw\M|\menabel\M|\msida\M|\mdanida\M|european union|\meu\M|embassy|lottery|international development|\mafdb\M|african development bank)' THEN 'Development partner or donor'
    WHEN n ~* 'development bank|\mudb\M|\meadb\M' THEN 'Development bank'
    WHEN n ~* '(sacco|co-?operative)' THEN 'SACCO'
    WHEN n ~* '(microfinance|micro finance|\mmdi\M|\mfinca\M|\mpride\M|ugafode|\mbrac\M)' THEN 'Microfinance institution'
    WHEN n ~* '(money ?lend)' THEN 'Money lender'
    WHEN n ~* '(mokash|wewole|digital|fintech|mobile money|\mmtn\M|airtel)' THEN 'Digital lender'
    WHEN n ~* '(\mbank\M|stanbic|centenary|\mdfcu\M|\mabsa\M|housing finance|equity bank|post bank|opportunity)' THEN 'Commercial bank'
    WHEN n ~* '(ministry|government|parish development|\mpdm\M|emyooga|livelihood|\muwep\M|\mylp\M|authority|agency|commission|\mnaads\M|operation wealth|\mowc\M|uganda investment|\muiri\M|council|presidential|state house|\mkcca\M|district)' THEN 'Government programme'
    WHEN n ~* '(foundation|\mngos?\M|charit|\mtrust\M|relief|mission|\mworld vision\M|\mcare\M|oxfam|heifer)' THEN 'NGO or foundation'
    WHEN n ~* '(capital|venture|invest|equity|angel|partners|\mfund managers?\M|accelerator)' THEN 'Investor'
    ELSE NULL
  END
$$ LANGUAGE sql IMMUTABLE;

UPDATE "funding_providers" pv
SET "providerCategory" = COALESCE(pg_temp.guess_funder(o."tradingName"), pg_temp.guess_funder(o."legalName"), 'Other')
FROM "organizations" o
WHERE o."id" = pv."organizationId" AND (pv."providerCategory" IS NULL OR btrim(pv."providerCategory") = '');

UPDATE "funding_programmes" fp
SET "providerCategory" = pv."providerCategory"
FROM "funding_providers" pv
WHERE pv."id" = fp."providerId" AND (fp."providerCategory" IS NULL OR btrim(fp."providerCategory") = '');

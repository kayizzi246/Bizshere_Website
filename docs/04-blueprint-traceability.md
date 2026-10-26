# 04 Blueprint traceability

**For:** the client and project lead. Shows where each requirement in the
*Database and Website Design Blueprint v1.0* (`source/`) is implemented.

Status: ✅ built and tested · 🟡 partly built (data model exists; some screens missing) · ⬜ not started.
Status as of 26 Oct 2026.

## §02 Requirements assessment

| Blueprint change | Implementation | Status |
|---|---|---|
| Separate machine specs from supplier offers | `machines` + `supplier_offers` (many offers per machine) | ✅ |
| Separate funding providers, programmes, rounds | `funding_providers` → `funding_programmes` → `application_rounds` | ✅ |
| Dated price observations with grade, unit, source, type | `price_observations` (history kept, never overwritten) | ✅ |
| Ingredient lines and numbered steps | `recipe_ingredients`, `recipe_steps` | ✅ |
| Download versions, ownership, access, review dates | `media_assets` (owner, reviewDueAt, accessLevel) + `file_versions`; served by `/api/files/[id]` | 🟡 no upload screen yet |
| Verification scope, evidence, reviewer, date | `verification_checks`, one row per check | ✅ |
| Dedicated investment opportunity records | `investment_opportunities`, `/opportunities` | ✅ |
| News scoped to business | `news_articles`, `/news` "Business news and updates" | ✅ |

## §03 Shared fields and records

| Requirement | Where | Status |
|---|---|---|
| Identity, introduction, classification | `content_items`, `categories`, `content_categories` | ✅ |
| Audience and business stages | `audiences`, `content_audiences`, `content_items.businessStages` | ✅ |
| Geographic relevance (applicability vs provider location) | `content_locations` vs `organization_locations` | ✅ |
| Publishing, freshness, access | `content_items` status, review dates, `accessLevel`, `content_entitlements` | ✅ |
| Source, evidence link | `sources`, `evidence_links` (with claim type); admin editor | ✅ |
| Media asset | `media_assets` | 🟡 no upload screen |
| Verification check | `verification_checks`; recorded from review queue and content editor | ✅ |
| Related content | `related_content`; edited in content editor; shown both ways | ✅ |
| Stable unit and currency identifiers | `units` table; ISO currency CHECK | ✅ |

## §04–§13 Directories

| § | Directory | Tables | Public pages | Admin entry | Status |
|---|---|---|---|---|---|
| 04 | Business ideas | business_ideas, idea_steps, budget_scenarios, budget_lines | `/business-ideas`, detail with low/standard/higher budget, totals from lines | Main form, steps, budget scenarios and lines | ✅ |
| 05 | Machines | machines (+JSON specifications), supplier_offers | `/machines`, detail with offers table | Main form; offers come from business portal + review | 🟡 admin can't add an offer directly |
| 06 | Suppliers | suppliers, supplier_product_listings, organizations, contacts, organization_locations | `/suppliers`, detail with offers, products, terms, branches, gated contacts | Main form | 🟡 no screens for product listings, branches, contacts |
| 07 | Funding | funding_providers, funding_programmes, application_rounds | `/funding`, detail with terms, eligibility, rounds | Main form, rounds editor | ✅ |
| 08 | Guides | guides, guide_steps, guide_documents, guide_fees | `/guides`, detail with official steps vs BizSphere tips, documents, fees | Main form, steps, documents | 🟡 no fee editor |
| 08 | Investment opportunities | investment_opportunities | `/opportunities`, detail with risk notice, promoter claims labelled | Main form | ✅ |
| 09 | Experts | consultants, qualifications, services, projects, reviews | `/experts`, detail with services, qualifications, permitted projects, moderated reviews | Main form | 🟡 no screens for qualifications, services, projects; no review submission or moderation |
| 10 | Recipes | recipes, ingredients, steps, recipe_costings, recipe_costing_lines | `/recipes`, detail with costing per portion and margin; shelf life only with evidence | Main form, ingredients, method | 🟡 no costing editor |
| 11 | Tools | tools, tool_versions, tool_test_cases, tool_calculations | `/tools`, detail with versions, rules, downloads | Main form | 🟡 no version/test editor; no interactive calculators yet |
| 12 | Markets and prices | markets, products, price_observations | `/prices`, like-for-like comparison, "observed on", stale warning | `/admin/prices`: observations, markets, products | 🟡 member price-history view not built |
| 13 | Useful websites | useful_websites | `/websites`, detail with link status, affiliate disclosure | Main form; weekly link check job | ✅ |
| 13 | Business news | news_articles, news_organizations | `/news`, detail with "what this means for your business" | Main form | ✅ |

## §14 Architecture and platform tables

| Requirement | Where | Status |
|---|---|---|
| PostgreSQL, constraints, full-text search, JSON specs | `schema.prisma`, `constraints.sql` (tested against invalid data) | ✅ |
| Users, roles, permissions | `users.role`, `src/lib/access.ts`, middleware | ✅ |
| Saved items, collections, saved searches | tables + `/account` + Save buttons + "Save this search" | ✅ |
| Submissions, corrections, moderation history | `submissions`, `correction_reports`, `moderation_events`; `/admin/review`, `/admin/corrections` | ✅ |
| File assets, document versions | `media_assets`, `file_versions`, `documents` | 🟡 no upload screen |
| Memberships, payments, entitlements | `membership_plans`, `subscriptions`, `payments`; webhook route | 🟡 gateway not connected |
| Search and usage events | `search_events`, `usage_events` (views, saves, downloads) | ✅ recorded; 🟡 no reports screen |

## §15–§16 Navigation, search, detail pages

| Requirement | Status |
|---|---|
| Goal-based main navigation, secondary links in header/footer | ✅ |
| Homepage sections in blueprint order, no autoplay or carousels | ✅ |
| One global search with directory filter, advanced search | ✅ |
| Result cards with type-specific facts | ✅ for ideas, machines, funding, checks; 🟡 others show summary only |
| Directory-specific filters (industry, budget, capacity, district...) | ⬜ directories list items and link to search; per-directory filters not built |
| Compare compatible items | ⬜ |
| Consistent detail page order: identity, key facts, practical detail, evidence, action, connected | ✅ all 12 detail pages |
| Readable URLs (`/business-ideas/small-bakery`) | ✅ |
| Controlled crawlable filters, sitemap, per-page meta descriptions | ⬜ |

## §17 Mobile and access

| Requirement | Status |
|---|---|
| Light background, one brand colour, large touch targets, labelled controls | ✅ (brand colours are placeholders until the client sends them) |
| Mobile filter drawer | ⬜ (depends on directory filters) |
| Alternative contact wherever WhatsApp appears | ✅ |
| Member dashboard: saved, collections, alerts, account | ✅ `/account` |
| Contributor dashboard: submissions and review status | ✅ `/business` |
| Access enforced on server incl. downloads and APIs | ✅ |

## §18 Administration

| Requirement | Status |
|---|---|
| Entry forms per directory | ✅ main fields for all 11; 🟡 some child tables (see above) |
| Duplicate checks | ✅ web address (slug) clash, organization name index; 🟡 no fuzzy duplicate warning |
| Draft/review/published/archived states | ✅ |
| Review queues | ✅ submissions and corrections |
| Broken-link reports | ✅ job records status; shown on website pages |
| Funding expiry handling | ✅ daily job opens/closes rounds; deadline alerts |
| Stale-price indicators | ✅ on public and admin price tables |
| Change history | ✅ `content_revisions` on every save, audit log |
| Correction workflow | ✅ |
| Bulk import with preview and validation | ⬜ |

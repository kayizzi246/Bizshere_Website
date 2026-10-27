# 07 Delivery plan

**For:** the client and project lead. Follows the five stages in blueprint §18.
Status as of 26 Oct 2026. Details per requirement: [04 Blueprint traceability](04-blueprint-traceability.md).

## Stage 1: Foundation ✅

*Completion condition: records can be entered, linked, reviewed and retrieved reliably.*

- [x] Categories, audiences, locations, units, organizations, sources, media tables
- [x] Users, roles, sign-in, server-side access rules
- [x] Publishing states, review dates, revision history, audit log
- [x] Full-text search with advanced options
- [x] Database rules (CHECK constraints) tested against invalid data
- [x] Runs locally without Docker (`npm run db:local`)
- [ ] File upload screen for media and downloads (storage and gated download route are ready)

## Stage 2: Core journey ✅ (some admin screens left)

*Completion condition: a user can research an idea and find requirements and contacts.*

- [x] Business ideas with steps and low/standard/higher budgets (totals from lines)
- [x] Machines with multiple dated supplier offers
- [x] Suppliers with offers, products, terms, gated contacts and dated checks
- [x] Funding programmes with terms, eligibility and application rounds
- [x] Guides with official steps, documents and fees
- [x] Experts with services, qualifications, projects and moderated reviews (display)
- [x] Admin entry forms for every directory, budgets, rounds, evidence, checks
- [x] ~~Business portal: sign-up, offers, all through review~~ Removed Oct 2026: the admin onboards and manages every business
- [ ] Admin screens: supplier product listings, branches and contacts; guide fees; expert qualifications, services and projects

## Stage 3: Resources 🟡

*Completion condition: tools, websites, recipes, news and investment opportunities each have suitable fields and evidence rules.*

- [x] Recipes with ingredients, method, costing per portion; shelf life only with evidence
- [x] Tools with versions and rule dates; saved results tied to rule version (table)
- [x] Useful websites with weekly link checks and affiliate disclosure
- [x] Business news with "what changed / who is affected / next step"
- [x] Investment opportunities with promoter claims labelled and a risk notice
- [ ] Recipe costing editor
- [ ] Tool version and test-case editor; first interactive calculator
- [ ] Expert review submission and moderation screen

## Stage 4: Price information 🟡

*Completion condition: a dependable collection and review process is operating.*

- [x] Markets, products, dated observations; history never overwritten
- [x] Like-for-like comparison only; stale warning
- [x] Admin entry and review queue for observations
- [ ] Member price-history view (chart per product and market)
- [ ] Bulk CSV import with preview and validation
- [ ] Agreed collection routine (who collects, which markets, how often): client decision

## Stage 5: Member features 🟡

*Completion condition: payment and access states work across pages, APIs and downloads.*

- [x] Saved items, collections, saved searches, alerts (`/account`)
- [x] Access enforced on pages, APIs and downloads
- [x] Deadline alerts, subscription expiry (daily jobs)
- [x] Payment webhook that activates subscriptions
- [ ] Connect a payment gateway (needs client account)
- [ ] Email delivery for alerts, password reset and invites
- [ ] Saved-search alerts (new results)
- [ ] Compare compatible items
- [ ] Per-directory filters and mobile filter drawer
- [ ] SEO: per-page descriptions, sitemap, crawl rules for filters

## Before launch

- [ ] Client brand items and contact details ([06 checklist](06-client-information-checklist.md))
- [ ] Legal pages approved by counsel
- [ ] Replace all sample records with researched content
- [ ] Hosting, domain, HTTPS, daily jobs scheduled, daily backups with a tested restore
- [ ] Accessibility check (WCAG 2.1 AA) on the final brand colours
- [ ] **Acceptance test passed** (below)

## Acceptance test (blueprint §18)

Run on the live site with real content, as a member:

1. Choose a business idea from the homepage.
2. Open its standard budget: every line is dated and sourced, and the total shows.
3. From "What you need", open a machine and compare at least two dated supplier offers.
4. Open a supplier and see the dated contact check and the contact details.
5. Open a linked funding programme: terms, eligibility, open round and application link.
6. Save the idea, the machine, the supplier and the programme into one collection.
7. In **My account**, the collection holds all four; saving the programme brings a deadline alert 7 days before it closes.

The journey works today with sample data. It passes when it works with real content.

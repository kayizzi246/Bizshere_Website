# 01 Project overview

**For:** everyone on the project.

## What BizSphere-Ug is

A searchable business information platform for Uganda. It helps a user move from a
business idea to the machines, suppliers, funding, guidance and expertise needed to
start it, with every price, budget and contact dated and sourced.

## Three areas

| Area | URL | Who | What they do |
|---|---|---|---|
| Public website | `/` | Visitors, free users, paying members | Search, browse 11 directories, read previews (free) or full detail (members), save items, report corrections |
| Admin | `/admin` | Editors, admins | Onboard businesses, add and edit all content, record verification checks, handle corrections, enter market prices, manage users |

Businesses do not sign up or manage listings themselves (the business portal and
self-service sign-up were removed in October 2026). They contact the team and an admin
creates and maintains their listing.

## The 11 directories

| Directory | Public URL | Blueprint |
|---|---|---|
| Business ideas and plans | `/business-ideas` | §04 |
| Machines | `/machines` | §05 |
| Suppliers | `/suppliers` | §06 |
| Funding programmes | `/funding` | §07 |
| Investment opportunities | `/opportunities` | §08 |
| Guides | `/guides` | §08 |
| Consultants and experts | `/experts` | §09 |
| Recipes | `/recipes` | §10 |
| Tools and templates | `/tools` | §11 |
| Markets and prices | `/prices` | §12 |
| Useful websites | `/websites` | §13 |
| Business news | `/news` | §13 |

Main navigation follows the blueprint's user goals (§15): Start a business · Machines and
suppliers · Funding and opportunities · Guides and tools · Markets and prices · Find an expert.

## How the pieces connect

- Every listing is a **content item** (title, summary, status, access level, review dates)
  with one **specialised record** (a machine, a recipe...). Shared features like search,
  saving, verification and corrections work the same everywhere.
- **Related content** links pages together. A business idea links to its machines,
  funding, recipes, tools and experts, and those pages link back. The idea page is the hub
  (§16).
- **Organizations** are stored once and can be a supplier, a funding provider and a
  consultancy at the same time.

## Access model (§17)

| Role | Sees / does |
|---|---|
| Visitor | Browses, reads previews, sources and freshness |
| Registered user | Plus saves items, collections, saved searches |
| Member (paid plan) | Full detail, contacts, downloads, price history, alerts |
| Contributor (business) | No separate area any more; signs in like a registered user |
| Editor | Admin: content, review, checks, corrections, prices |
| Admin | Plus users, roles and settings |

Access is enforced on the server for pages, APIs and file downloads. The blurred rows
behind "Show more" contain no real data.

## Technology

Next.js 14 (TypeScript), PostgreSQL with Prisma, NextAuth, Tailwind CSS. Runs on any
Node.js host. Locally it needs only Node.js; the database runs from npm (`npm run db:local`).

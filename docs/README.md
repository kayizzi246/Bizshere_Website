# BizSphere-Ug project documents

Read them in this order. Each document says who it is for.

| # | Document | For | What it answers |
|---|---|---|---|
| 01 | [Project overview](01-project-overview.md) | Everyone | What the platform is, who uses it, how the pieces fit |
| 02 | [Setup and operations](02-setup-and-operations.md) | Developers, hosting | Running it (no Docker needed), environment variables, daily jobs, files, payments, deploying, backups |
| 03 | [Database design](03-database/README.md) | Developers | Table groups, relationships diagram, data rules, how to change the schema |
| 03 | [Data dictionary](03-database/data-dictionary.md) | Developers, analysts | Every table and column (generated: `npm run docs:db`) |
| 04 | [Blueprint traceability](04-blueprint-traceability.md) | Client, project lead | Where each blueprint requirement lives in the database and on the site |
| 05 | [Editor guide](05-editor-guide.md) | Editors, admins | How to add and check content, record verification, handle corrections and prices |
| 06 | [Client information checklist](06-client-information-checklist.md) | Client, project lead | Brand items still needed (logo, colours, fonts...) and where each goes |
| 07 | [Delivery plan](07-delivery-plan.md) | Client, project lead | The five delivery stages, what is done, what is left, the acceptance test |
| 08 | [Deploy to Vercel](08-deploy-to-vercel.md) | Whoever puts the site online | Step-by-step: Vercel project, Neon database, tables, admin, daily jobs |
| 09 | [SMS, payments and logins](09-sms-payments-and-logins.md) | Whoever sets up the site | EgoSMS, Resend email, Pesapal payments (sandbox and live), every sign-in method, renewal reminders, go-live checklist |
| 10 | [Security](10-security.md) | Owner, developer, hosting | Bot and scanner blocking, rate limits, staff SMS codes, Vercel Firewall settings, secrets, what to do in an incident |

## Running it on your own server

| Document | For | Covers |
| --- | --- | --- |
| [Deploying to Coolify](deploy-coolify.md) | Whoever sets up the site | Building from the Dockerfile, environment variables, persistent storage for uploads |
| [Moving the database onto the VPS](move-database-to-vps.md) | Owner, developer | Leaving a managed database for Postgres beside the app: what to do about the old data, step by step, and what to verify |
| [Keeping the server safe, and the data recoverable](security-and-backups.md) | Owner, developer | What to do before entering real data, backups that are actually tested, locking the database down, SSH, patching, secrets |
| [The old Prisma Postgres database](restore-old-data.md) | Owner | What happened to it and what can still be done |

## Source documents

Kept unchanged in [`source/`](source/):

- `BizSphere_Ug_Database_and_Website_Design_Blueprint.pdf`: the requirements this build follows (v1.0, 23 Oct 2026)
- `BizSphere-Ug_Client_Information_Request.pdf`: brand items requested from the client

## Keeping documents current

- After any change to `prisma/schema.prisma`: run `npm run docs:db` and update `04-blueprint-traceability.md` if a requirement moved.
- When the client sends a brand item: tick it in `06-client-information-checklist.md`.
- When a delivery stage item is finished: tick it in `07-delivery-plan.md`.

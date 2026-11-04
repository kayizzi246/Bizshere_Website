# Security

**For:** whoever runs the site (owner, developer, hosting).
**Covers:** what the site protects itself against, what to switch on in Vercel and your accounts, and what to do if something goes wrong.

Security here works in layers. No single one stops everything; together they make attacks slow, expensive and visible.

| Layer | Stops | Where |
|---|---|---|
| 1. Vercel Firewall | Floods (DDoS), bad bots, attack traffic, before it reaches the site | Vercel dashboard ([section 2](#2-switch-on-in-vercel)) |
| 2. Edge checks | Scanners and probes for WordPress, PHP, `.env`, `.git`…; known attack tools | `src/middleware.ts` |
| 3. Rate limits | SMS pumping, password guessing, payment spam, form spam | `src/lib/rate-limit.ts` |
| 4. Sign-in | Stolen passwords (staff also need an SMS code), locked-out guessing | `src/lib/auth.ts` |
| 5. Access rules | Paid content and admin pages shown only to the right people, checked on the server | `src/lib/access.ts` |
| 6. Browser protections | Cross-site scripting, clickjacking, mixed content | Security headers in `next.config.mjs` |

---

## 1. What the site does by itself

### Bots and hackers

- **Probes are refused at the edge.** Requests for things this site never has (`/wp-login.php`, `/.env`, `/.git/config`, `/phpmyadmin`, any `.php`/`.asp` page…) get a bare "404 Not found" before any page or database work. These are automated scans looking for a weakness.
- **Known attack tools are refused** (sqlmap, nikto, nmap, wpscan, nuclei and similar), by their user agent.
- **Unusual HTTP methods are refused** (e.g. `TRACE`).
- **Form bots:** the correction form has a hidden "honeypot" field. People never see it; bots that fill in every field are quietly ignored.

### Rate limits

Counters are kept in the database, so they hold on Vercel where each request may run on a different server. Change the numbers in `LIMITS` in `src/lib/rate-limit.ts`.

| What | Limit | Why |
|---|---|---|
| Sign-in / PIN-reset codes per number | 1 per 30 s, 5 per hour | Nobody can flood one phone |
| Codes texted from one IP address | 10 per hour | Stops **SMS pumping** (a bot sending codes to thousands of numbers to drain your SMS credit) |
| All codes the site texts | 300 per hour | A ceiling on SMS spending, whatever the source |
| Sign-in attempts from one IP address | 30 per 15 min | Stops password spraying across many accounts |
| Wrong passwords for one account | 5 per 15 min, then paused | Stops guessing one account's password |
| Wrong tries per sign-in code | 5, then the code stops working | Codes can't be guessed |
| Payments started per person | 10 per 10 min | Stops order spam at Pesapal |
| Correction reports from one IP address | 5 per hour | Stops form spam |

Blocked attempts are written to the audit log (`auth.login_blocked`, `auth.code_limited`).

### Sign-in

- **Members** sign in with their phone and a texted code: no passwords to steal or reuse.
- **Staff (admins and editors)** sign in with their password **and then a 6-digit code texted to their phone**. A leaked password alone doesn't open the admin.
  - The code goes to the phone on the staff account. **Admin → Team** shows "SMS code at sign-in" or "Password only: add a phone" for each person. Add a phone for everyone.
  - If SMS is ever down and staff are locked out, set `STAFF_SMS_CODE="off"` in Vercel and redeploy. Remove it again as soon as SMS works.
- **Sellers and experts** sign in with phone + 4-digit PIN; 5 wrong PINs pause sign-in, and a forgotten PIN is reset with a texted code.
- **Staff sessions end after 12 hours.** Every session re-checks the account every 5 minutes: a suspended account or a role change takes effect within minutes.
- **Sign everyone out:** Admin → Team → "Sign everyone out" ends every session on every device within 5 minutes (use it after a lost phone or a shared password).
- The staff sign-in page is at a private link (`/staff/<ADMIN_LOGIN_KEY>`); guessing the address shows "page not found".

### Payments

- Access is granted only after the server asks Pesapal for the order's real status. A fake "payment succeeded" message, a forged notification or a tampered return page can't unlock anything.
- The amount, currency and order reference are checked against what was charged.

### Data and files

- Member-only data is removed on the server; it never reaches a visitor's browser (see the rules in the README).
- Uploads are only for staff, sellers and experts, limited to images and office documents, with size limits, checked on the server.
- Private files are served only through `/api/files/[id]`, which checks access first.
- Passwords and PINs are stored as bcrypt hashes, never as text.

---

## 2. Switch on in Vercel

Open the project in Vercel → **Firewall**.

1. **DDoS protection** is always on for every Vercel project; nothing to do.
2. **Bot protection:** Firewall → **Bot Management** (or **Managed Rules**, depending on your plan) → turn on **Bot Protection**, set to **Challenge** if offered (otherwise **Log** first to watch, then switch). Real browsers pass without noticing; scripted bots are stopped.
3. **AI crawlers** (optional): in the same place, block **AI Bots** if you don't want your content copied into AI training sets.
4. **Under attack?** Firewall → **Attack Challenge Mode** → on. Every visitor gets a short browser check until you turn it off. Turn it on only during an attack: it adds a moment to everyone's first visit.
5. **Extra rules** (Firewall → **Custom Rules**), optional:
   - Rate limit `/api/auth/` to, for example, 60 requests per minute per IP (if your plan includes rate-limit rules).
   - If you only serve East Africa and see attacks from elsewhere: challenge (don't block) other countries.

After changing rules, watch **Firewall → Traffic** for a day to make sure real visitors aren't being stopped.

---

## 3. Your accounts and secrets

The site is only as safe as the accounts that control it.

- **Turn on two-step login** for **Vercel**, **GitHub**, your **domain registrar**, **Pesapal**, **EgoSMS** and your **email**. Whoever controls those controls the site.
- **Secrets live only in Vercel's environment variables** (and your local `.env`, which is never pushed). Never paste them into chats, emails, screenshots or code.
- **Change a secret if it may have been seen:** `NEXTAUTH_SECRET` (changing it signs everyone out), `EGOSMS_PASSWORD`, Pesapal keys, `ADMIN_LOGIN_KEY`, `CRON_SECRET`.
- **Never set on the live site:** `OTP_TEST_PHONE`, `OTP_TEST_CODE` (free sign-in for anyone who knows them), `PAYMENT_SIMULATE` (free memberships), `SMS_CONSOLE`.
- **Give people the least access they need:** sub-admins (editors) with only their areas ticked, rather than more super admins. Remove staff access as soon as someone leaves (Admin → Team → Remove admin access).

---

## 4. If something goes wrong

1. **Someone may have staff access who shouldn't:** Admin → Team → suspend the account (or remove admin access), then **Sign everyone out**. Change that person's password.
2. **A secret leaked** (in a screenshot, chat, repository…): change it at its source (EgoSMS, Pesapal, …), update it in Vercel, redeploy.
3. **Flood of traffic or SMS spending:** turn on **Attack Challenge Mode** in Vercel. Check the audit log for `auth.code_limited` and the EgoSMS outbox.
4. **Strange payments:** Admin → Payments, and the Pesapal merchant dashboard. Pesapal can cancel unpaid orders and refund paid ones.
5. **Need everyone signed out right now** (not within 5 minutes): change `NEXTAUTH_SECRET` in Vercel and redeploy.

---

## 5. Keeping it secure

- **Updates:** run `npm audit` every month. Patch releases (same first number, e.g. 4.24.10 → 4.24.15) can go in straight away; test the site after.
- **Planned upgrade:** Next.js 14 (in use) no longer gets security fixes for some newer advisories, which are fixed only in Next.js 15/16. Plan the upgrade as its own piece of work: it changes some APIs and needs a full test.
- **Watch the logs:** Vercel → Logs, filter `level:error`, every week; the audit log (database table `audit_logs`) records sign-ins, blocked attempts, payments and admin changes.
- **Backups:** see [02-setup-and-operations.md](02-setup-and-operations.md).

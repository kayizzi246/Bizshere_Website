# SMS, payments and logins: setup

**For:** whoever sets up the site, locally or online (developer, hosting).
**Covers:** text messages (EgoSMS), email (Resend), payments (Pesapal), every way people sign in, and the daily reminder job.

All settings go in `.env` locally, or in the host's environment variables online (Vercel: Project → Settings → Environment Variables, then redeploy). `.env.example` lists every one with a short note.

---

## Contents

1. [At a glance](#1-at-a-glance)
2. [Text messages (EgoSMS)](#2-text-messages-egosms)
3. [Email (Resend)](#3-email-resend)
4. [Payments (Pesapal)](#4-payments-pesapal)
5. [Logins](#5-logins)
6. [Renewal reminders (daily job)](#6-renewal-reminders-daily-job)
7. [Going live checklist](#7-going-live-checklist)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. At a glance

| Feature | Service | Needs | Without it |
|---|---|---|---|
| Sign-in codes, seller/expert PINs, SMS reminders and receipts | EgoSMS | `EGOSMS_USERNAME`, `EGOSMS_PASSWORD` | Only the test number can sign in by phone |
| Email reminders and receipts | Resend | `RESEND_API_KEY`, `EMAIL_FROM` | Members who signed up with email get account alerts only |
| Membership payments (MoMo, Airtel Money, cards) | Pesapal | `PESAPAL_CONSUMER_KEY`, `PESAPAL_CONSUMER_SECRET` | The pop-up says payments aren't connected yet |
| Google sign-in | Google Cloud | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | The Google button is hidden |
| Staff sign-in page | — | `ADMIN_LOGIN_KEY` | Staff use `/login?callbackUrl=/admin` instead |
| Sessions (all logins) | NextAuth | `NEXTAUTH_URL`, `NEXTAUTH_SECRET` | Nothing works: required |
| Renewal reminders | Vercel Cron | `CRON_SECRET` | No reminders are sent |

**Fastest local setup** (no accounts needed): set `SMS_CONSOLE="true"` (codes and emails print in the terminal) and either `PESAPAL_ENV="sandbox"` with sandbox keys, or `PAYMENT_SIMULATE="true"`.

---

## 2. Text messages (EgoSMS)

Used for: phone sign-in codes, seller and expert PINs, forgotten-PIN codes, payment receipts and renewal reminders. Code: `src/lib/sms.ts`.

### Set up

1. Create an account at [comms.egosms.co](https://comms.egosms.co) and top up credit.
2. Get the API username and password: on the newer portal, **Settings → API Settings**. On the older egosms.co portal (menu: Payments, Send sms, Contact Manager…) there is no such page: use the account's **User Name** (shown under View Profile) and its login password.
3. Optional: a **Sender ID**, the name shown as the sender on people's phones (e.g. `BizSphere`, usually at most 11 letters or digits, no spaces). It isn't set in the portal: ask Pahappa to approve it (info@pahappa.com, 0788 200 915 / 0707 811 113). Until they confirm, leave `EGOSMS_SENDER_ID` empty, so messages come from `EgoSMS`. An unapproved sender ID can get messages rejected.
4. Add to `.env`:

   ```env
   EGOSMS_USERNAME="your-api-username"
   EGOSMS_PASSWORD="your-api-password"
   EGOSMS_SENDER_ID=""          # only once approved on the account
   EGOSMS_URL=""                # empty = live service; the sandbox address only for testing
   SMS_CONSOLE=""               # must be empty to really send
   ```

5. Check it:

   ```bash
   npm run sms:test -- 0772123456
   ```

   You should get "BizSphere-Ug test message: SMS is working." on that phone. If not, the command prints EgoSMS's reason.

### Local testing without EgoSMS

```env
SMS_CONSOLE="true"
```

Every text (with the sign-in code) and every email is printed in the terminal running `npm run dev` instead of being sent. This is ignored on Vercel and in production builds, so it can't leak to the live site.

### Limits built in

- A code is 6 digits and lasts **10 minutes**; 5 wrong tries and it stops working.
- At most **one code every 30 seconds** and **5 per hour** per number, so the form can't be used to flood a phone.

---

## 3. Email (Resend)

Used for: payment receipts and renewal reminders to members who signed up with an email address (Google sign-in or staff-created accounts). Members with a phone number get the same messages by SMS; members with both get both. Code: `src/lib/email.ts`.

### Set up

1. Create an account at [resend.com](https://resend.com).
2. **Domains → Add domain** (e.g. `bizsphere.ug`) and add the DNS records it shows. Wait until it says *Verified*.
3. **API Keys → Create API key** (sending access is enough).
4. Add to `.env`:

   ```env
   RESEND_API_KEY="re_..."
   EMAIL_FROM="BizSphere-Ug <hello@bizsphere.ug>"   # an address on the verified domain
   ```

Locally, `SMS_CONSOLE="true"` prints emails in the terminal too.

---

## 4. Payments (Pesapal)

Members pay for a **day, week, month or year** with MTN MoMo, Airtel Money or a Visa/Mastercard card. Code: `src/lib/payments.ts` (Pesapal API), `src/lib/membership.ts` (granting access), `src/app/actions/onboarding.ts` (the pop-up's server side).

### How it works

1. The person taps a plan. The pop-up asks the server to create the order with Pesapal.
2. Pesapal's payment page opens **inside the pop-up** (an iframe). They choose MoMo, Airtel Money or card there and pay.
3. Pesapal tells the site in two ways: it calls the **IPN** address `/api/payments/webhook`, and it loads `/payments/return` inside the iframe. The pop-up also checks every few seconds.
4. None of those is trusted on its own: each one makes the server ask Pesapal for the order's real status. Only a completed order, for the full amount, opens access. A payment is never counted twice.
5. The pop-up closes and the welcome screen plays. The member gets a receipt by SMS or email.
6. If they change plan or close the pop-up before paying, the unpaid order is **cancelled** at Pesapal so it can't be paid later.

### Test with the sandbox (no real money)

1. Get sandbox keys: register a demo merchant at [developer.pesapal.com](https://developer.pesapal.com), or use the demo keys listed on Pesapal's developer site for Uganda.
2. Add to `.env`:

   ```env
   PESAPAL_CONSUMER_KEY="sandbox-key"
   PESAPAL_CONSUMER_SECRET="sandbox-secret"
   PESAPAL_ENV="sandbox"
   PESAPAL_IPN_ID=""
   ```

3. Set test prices (UGX 500 a day, 2,000 a week, 5,000 a month, 50,000 a year):

   ```bash
   npm run plans:test-prices
   # or your own: npm run plans:test-prices -- <daily> <weekly> <monthly> <yearly>
   ```

4. `npm run dev`, sign in, tap **Subscribe** on `/membership`, and pay with Pesapal's sandbox test details.

   On localhost, Pesapal can't reach the IPN address, but the pop-up's own checks still confirm the payment, so the whole flow works.

The pricing page shows a **"Test mode"** badge while `PESAPAL_ENV="sandbox"` or `PAYMENT_SIMULATE="true"`.

### Go live

1. Sign a merchant agreement with Pesapal and get **live** keys from the merchant dashboard.
2. Set the live keys, and **remove** `PESAPAL_ENV` (or set it to empty):

   ```env
   PESAPAL_CONSUMER_KEY="live-key"
   PESAPAL_CONSUMER_SECRET="live-secret"
   PESAPAL_ENV=""
   ```

3. `NEXTAUTH_URL` must be the public **https** address (e.g. `https://bizsphere.ug`). It's used for Pesapal's return page and the IPN address.
4. Get the **IPN id** (`PESAPAL_IPN_ID`). With the live keys in `.env`, run:

   ```bash
   npm run pesapal:ipn -- https://<your domain>/api/payments/webhook
   ```

   It registers that address with your Pesapal account (or finds it, if it's already registered) and prints the line to copy, e.g. `PESAPAL_IPN_ID="5d68…"`. Put it in `.env` and in the host's environment variables. The id belongs to one account and one server: run it again for the sandbox keys and for the live keys, and after changing the domain. If you leave `PESAPAL_IPN_ID` empty, the site registers the address by itself on the first payment.
5. Set the real prices at **Admin → Membership prices** (`/admin/plans`). An empty box shows "Price coming soon" for that plan.
6. Make one real payment with the smallest plan and check it in **Admin → Payments**.

### Demo mode without Pesapal

```env
PAYMENT_SIMULATE="true"
```

Every payment succeeds at once without charging anyone. For demos only. **Never set it on the live server.**

### Where to see payments

- **Admin → Payments** (`/admin/payments`): every payment, its method (MTN MoMo, Airtel Money, Card), status (Paid, Pending, Failed, Cancelled, Refunded) and the CSV export.
- Each member sees their own payments on **My account → My membership**.

---

## 5. Logins

Everyone stays signed in on their device for a year, except staff (see below).

| Who | Where | How | Set up |
|---|---|---|---|
| Members and visitors | Sign-up pop-up, `/signup`, `/login` | Phone number + 6-digit code by SMS. The account is created on the first sign-in | EgoSMS ([section 2](#2-text-messages-egosms)) |
| Members (optional) | Same places | **Continue with Google** | Google keys (below) |
| Staff (admins and editors) | `/staff/<ADMIN_LOGIN_KEY>`, or `/admin` (redirects to sign-in) | Email + password | `ADMIN_LOGIN_KEY`, first admin from the seed |
| Sellers (suppliers) | `/suppliers/login`, or their personal address | Phone + 4-digit PIN | The team registers them in Admin |
| Experts | `/experts/login`, or their personal address | Phone + 4-digit PIN | The team registers them in Admin |

### Required for all logins

```env
NEXTAUTH_URL="https://bizsphere.ug"      # http://localhost:3000 locally
NEXTAUTH_SECRET="a-long-random-string"   # generate: openssl rand -base64 32
```

Changing `NEXTAUTH_SECRET` signs everyone out.

### Google sign-in (optional)

1. [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials) → **Create credentials → OAuth client ID** → type **Web application**.
2. **Authorised redirect URI:** `<NEXTAUTH_URL>/api/auth/callback/google`, e.g. `https://bizsphere.ug/api/auth/callback/google` (add `http://localhost:3000/api/auth/callback/google` for local testing).
3. Add to `.env`:

   ```env
   GOOGLE_CLIENT_ID="...apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="..."
   ```

Leave them empty to hide the Google button.

### Staff (admins and editors)

1. **First admin:** created by the seed from `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`. Online, run `npm run db:production-setup` once. Change the password after the first sign-in.
2. **Private sign-in link:** set a random key of at least 16 characters:

   ```bash
   node -e "console.log(require('crypto').randomBytes(12).toString('base64url'))"
   ```

   ```env
   ADMIN_LOGIN_KEY="the-generated-key"
   ```

   Staff sign in at `https://<your domain>/staff/<ADMIN_LOGIN_KEY>`. Any other key shows "page not found", so the form can't be found by guessing. The password is still what protects the admin; don't share the link outside the team.
3. **More staff:** **Admin → Team** (`/admin/team`). Super admins open everything; sub-admins (editors) only the areas ticked for them.
4. **Safety built in:** 5 wrong passwords lock that login for 15 minutes; staff sessions end after 12 hours; a role change or suspension takes effect within 5 minutes.

### Sellers and experts (phone + PIN)

1. In Admin, open **Suppliers: logins** or **Experts: logins** and register the person's phone number and a username.
2. The site texts them a 4-digit PIN (needs EgoSMS). On their first sign-in they must choose their own PIN.
3. They sign in at `/suppliers/login` or `/experts/login` with phone + PIN, or at their **personal address**, the site address followed by their username (e.g. `bizsphere.ug/kampala-bakers`), with the PIN alone.
4. **Forgot PIN:** the sign-in form texts them a code to set a new one.

### Test login without SMS (local only)

```env
OTP_TEST_PHONE="123456789"
OTP_TEST_CODE="0000"
```

That number signs in with that code and no SMS is sent, and it gets member access so you can see paid pages. **Never set these on the live server:** anyone who knows them could sign in.

---

## 6. Renewal reminders (daily job)

Once a day the site sends renewal reminders (and other upkeep: closing funding rounds, expiring memberships). Code: `src/lib/jobs.ts`, job `renewals`.

| Plan | Reminders |
|---|---|
| Day pass | None (too short) |
| Weekly | 1 day before it ends, and when it has ended |
| Monthly, Yearly | 3 days before, 1 day before, and when it has ended |

Each reminder goes by SMS to members with a phone and by email to members with an email, plus an alert on their account page. It links to the renewal pop-up. Each one is sent once per period. Members can turn reminders off on **My account → My membership**.

**Online (Vercel):** `vercel.json` already schedules `/api/cron/daily` at 00:15 every day. Set `CRON_SECRET` (any long random string) in the project's environment variables; Vercel sends it with each call and the route refuses calls without it.

**Other hosts, or by hand:**

```bash
npm run jobs                  # all jobs
npm run jobs -- renewals      # only the renewal reminders
```

---

## 7. Going live checklist

- [ ] `NEXTAUTH_URL` is the public https address; `NEXTAUTH_SECRET` is long and random
- [ ] `EGOSMS_USERNAME` / `EGOSMS_PASSWORD` set, account has credit, `npm run sms:test` works
- [ ] `SMS_CONSOLE`, `OTP_TEST_PHONE`, `OTP_TEST_CODE` and `PAYMENT_SIMULATE` are **empty**
- [ ] Pesapal **live** keys set and `PESAPAL_ENV` empty
- [ ] Real prices set at `/admin/plans` (the test-price migration only fills prices that are empty)
- [ ] One real payment made and visible in Admin → Payments
- [ ] `RESEND_API_KEY` and `EMAIL_FROM` set, domain verified (if emailing members)
- [ ] `ADMIN_LOGIN_KEY` set; seed admin password changed
- [ ] `CRON_SECRET` set; the daily job shows in Vercel → Cron Jobs
- [ ] Google redirect URI uses the live domain (if Google sign-in is on)

---

## 8. Troubleshooting

| Problem | Likely cause | Fix |
|---|---|---|
| "We can't send text messages yet" | EgoSMS keys missing, wrong, or no credit | Run `npm run sms:test -- <number>` and read the reason |
| Texts arrive from "EgoSMS", not your name | Sender ID not approved | Leave `EGOSMS_SENDER_ID` empty until EgoSMS approves it |
| Code printed in terminal, not sent | `SMS_CONSOLE="true"` | Set it to `""` |
| "Online payments aren't connected yet" | Pesapal keys missing | Set `PESAPAL_CONSUMER_KEY` and `PESAPAL_CONSUMER_SECRET` |
| "We couldn't open the payment page" | Wrong keys for the environment (sandbox keys on live or the reverse), or Pesapal unreachable | Check `PESAPAL_ENV` matches the keys; see the server log line `pesapal checkout:` |
| Payment page stays blank in the pop-up | Content-Security-Policy blocks the frame | `next.config.mjs` must list `https://pay.pesapal.com` (and `https://cybqa.pesapal.com`) under `frame-src` |
| Paid, but access opens only after a minute | IPN can't reach the site (common on localhost) | Online: check `NEXTAUTH_URL` is the public https address. The pop-up's own checks open access anyway |
| Plan shows "Price coming soon" | No price for that plan | Set it at `/admin/plans` |
| Staff link shows "page not found" | `ADMIN_LOGIN_KEY` unset, shorter than 16 characters, or mistyped | Set it and redeploy |
| "Too many attempts" at staff or PIN sign-in | 5 wrong passwords in 15 minutes | Wait 15 minutes |
| Google sign-in error "redirect_uri_mismatch" | Redirect URI doesn't match `NEXTAUTH_URL` | Add `<NEXTAUTH_URL>/api/auth/callback/google` in Google Cloud |
| No renewal reminders | Daily job not running, or `CRON_SECRET` missing | Check Vercel → Cron Jobs; run `npm run jobs -- renewals` by hand |

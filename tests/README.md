# Tests

Run unit and regression checks with npm test.

## Browser and database checks

The end-to-end suite requires the local PostgreSQL database and the configured OTP test account. It refuses to create test fixtures against a remote database. It exercises public pages, all published details, account collections and wishlist, member PDF contents, staff password login, admin forms, editor permissions, mobile layouts, API access checks, and payment configuration errors. Temporary local user records are removed in a finally block. Existing content and configuration are not edited.

1. Install the browser: npx playwright install chromium.
2. Build in an isolated folder to avoid overwriting a running development server:

   PowerShell: $env:NEXT_DIST_DIR='.next-verify'; npm run build

3. Start that build in the same terminal:

   PowerShell: $env:NEXTAUTH_URL='http://localhost:3100'; npm run start -- -p 3100

4. In another terminal, run npm run test:e2e.

TEST_BASE_URL overrides the default http://localhost:3100. Use a local server with local authentication callbacks. The suite does not send SMS or email and does not submit real payment orders. Missing provider credentials are exercised as configuration errors. Live provider delivery and settlement need separate tests with configured accounts.

Screenshots and the JSON report are saved in tests/artifacts/ (ignored by Git). Chromium is used at desktop and mobile viewport sizes; this is not a Safari or Firefox compatibility test.

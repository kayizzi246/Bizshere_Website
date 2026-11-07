const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
async function pdfItems(response) {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loading = getDocument({ data: new Uint8Array(await response.body()), useSystemFonts: true, verbosity: 0 });
  const doc = await loading.promise;
  try {
    const text = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      text.push(...(await page.getTextContent()).items.map(item => item.str));
    }
    return text;
  } finally { await loading.destroy(); }
}
const BASE = process.env.TEST_BASE_URL || 'http://localhost:3100';
const prisma = new PrismaClient();
const results = [];
const errors = [];
const accounts = [];
const artifacts = path.join(__dirname, 'artifacts');
fs.mkdirSync(artifacts, { recursive: true });
const paths = { BUSINESS_IDEA: '/business-ideas', MACHINE: '/machines', SUPPLIER: '/suppliers', FUNDING_PROGRAMME: '/funding', INVESTMENT_OPPORTUNITY: '/opportunities', GUIDE: '/guides', CONSULTANT: '/experts', RECIPE: '/recipes', TOOL: '/tools', WEBSITE: '/websites', NEWS: '/news', BUSINESS_TIP: '/tips' };
async function check(name, fn) {
  try { const detail = await fn(); results.push({ name, passed: true, detail: typeof detail === 'string' ? undefined : detail }); console.log('PASS ' + name); }
  catch (e) { results.push({ name, passed: false, error: e.message }); console.log('FAIL ' + name + ': ' + e.message); }
}
function watch(page, label) {
  page.on('pageerror', e => errors.push({ page: label, error: e.message }));
  page.on('console', m => { if (m.type() === 'error' && /hydration|Minified React error|server rendering/i.test(m.text())) errors.push({ page: label, error: m.text() }); });
}
async function visit(page, route, status = 200) {
  const response = await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 30000 });
  if (status === 404 && response.status() === 200) {
    // Next.js streams its loading boundary before resolving dynamic notFound().
    const html = await response.text();
    assert.match(html, /NEXT_NOT_FOUND|NEXT_HTTP_ERROR_FALLBACK;404/);
    assert.match(html, /name="robots" content="noindex"/);
  } else assert.equal(response.status(), status, route + ': unexpected HTTP status');
  const body = await page.locator('body').innerText();
  assert.ok(!/This page didn.t load|Application error:|Internal Server Error/.test(body), route + ': error boundary');
  return body;
}
async function credentialLogin(context, user, password) {
  const csrf = await (await context.request.get(BASE + '/api/auth/csrf')).json();
  const response = await context.request.post(BASE + '/api/auth/callback/credentials', {
    form: { csrfToken: csrf.csrfToken, identifier: user.email, password, json: 'true', callbackUrl: BASE + '/account' },
    headers: { 'X-Auth-Return-Redirect': '1' },
  });
  assert.ok(response.ok());
  const session = await (await context.request.get(BASE + '/api/auth/session')).json();
  assert.equal(session.user?.id, user.id, 'credentials login did not establish a session');
}
(async () => {
  let browser;
  try {
    assert.ok(['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname), 'This test suite only creates fixtures in a local database');
    await check('database connectivity and migrations', async () => {
      await prisma.$queryRawUnsafe('SELECT 1');
      const applied = await prisma.$queryRawUnsafe('SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL');
      const migrations = fs.readdirSync('prisma/migrations').filter(n => fs.existsSync(path.join('prisma/migrations', n, 'migration.sql')));
      const missing = migrations.filter(n => !applied.some(r => r.migration_name === n));
      assert.deepEqual(missing, [], 'unapplied migrations');
      return { applied: applied.length };
    });
    const content = await prisma.contentItem.findMany({ where: { publicationStatus: 'PUBLISHED' }, select: { id: true, slug: true, contentType: true }, orderBy: { createdAt: 'asc' } });
    const samples = Object.keys(paths).map(type => content.find(c => c.contentType === type)).filter(Boolean);
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    await context.addCookies([{ name: 'cookie-notice', value: 'accepted', url: BASE }]);
    const page = await context.newPage();
    watch(page, 'public desktop');
    const publicRoutes = ['/', ...Object.values(paths), '/forum', '/prices', '/membership', '/about', '/contact', '/terms', '/privacy', '/methodology', '/login', '/signup', '/suppliers/login', '/experts/login', '/search', '/search?q=bakery', '/search?q=%27%3Cscript%3E', '/search?page=-1', '/business-ideas?page=abc', '/machines?page=999999', '/corrections', '/demo', ...samples.map(c => paths[c.contentType] + '/' + c.slug)];
    for (const route of publicRoutes) await check('page ' + route, () => visit(page, route));
    // Render one of every directory page type, and fetch every published detail page.
    for (const item of content) {
      const route = paths[item.contentType] + '/' + item.slug;
      await check('published detail ' + route, async () => {
        const res = await context.request.get(BASE + route);
        assert.equal(res.status(), 200);
        assert.ok(!/This page didn.t load|Internal Server Error/.test(await res.text()));
      });
    }
    for (const route of ['/does-not-exist-e2e', '/machines/does-not-exist-e2e', '/business-ideas/does-not-exist-e2e', '/staff/invalid-e2e-key']) {
      await check('missing route ' + route, () => visit(page, route, 404));
    }
    await check('health API', async () => {
      const r = await context.request.get(BASE + '/api/health');
      assert.equal(r.status(), 200); assert.deepEqual(await r.json(), { ok: true, db: 'up' });
    });
    for (const route of ['/admin', '/admin/team', '/admin/payments/export', '/account', '/supplier', '/expert']) {
      await check('anonymous protection ' + route, async () => {
        const r = await context.request.get(BASE + route, { maxRedirects: 0 });
        if (r.status() === 200) assert.match(await r.text(), /http-equiv="refresh" content="1;url=\/(?:login|suppliers\/login|experts\/login)/);
        else { assert.ok([303, 307].includes(r.status())); assert.match(r.headers().location, /login/); }
      });
    }
    for (const method of ['GET', 'POST']) {
      await check('anonymous upload ' + method, async () => {
        const r = await context.request.fetch(BASE + '/api/admin/upload', { method });
        assert.ok([403, 501].includes(r.status()));
      });
    }
    await check('anonymous cron blocked', async () => {
      const r = await context.request.get(BASE + '/api/cron/daily');
      assert.equal(r.status(), process.env.CRON_SECRET ? 401 : 503);
    });
    await check('missing file', async () => {
      const r = await context.request.get(BASE + '/api/files/e2e-missing'); assert.equal(r.status(), 404);
    });
    for (const payload of [null, [], {}, { OrderTrackingId: 42 }]) await check('malformed IPN ' + JSON.stringify(payload), async () => {
      const r = await context.request.post(BASE + '/api/payments/webhook', { data: JSON.stringify(payload), headers: { 'content-type': 'application/json' } });
      assert.equal(r.status(), 400);
    });
    await check('security headers', async () => {
      const r = await context.request.get(BASE + '/');
      const h = r.headers(); assert.equal(h['x-frame-options'], 'DENY'); assert.equal(h['x-content-type-options'], 'nosniff'); assert.match(h['content-security-policy'], /frame-ancestors 'none'/);
    });
    await check('payment return permits same-site framing', async () => {
      const r = await context.request.get(BASE + '/payments/return'); assert.equal(r.status(), 200); assert.equal(r.headers()['x-frame-options'], 'SAMEORIGIN');
    });
    const idea = samples.find(c => c.contentType === 'BUSINESS_IDEA');
    let previewPdfBytes = 0;
    if (idea) await check('anonymous PDF preview is available', async () => {
      const r = await context.request.get(BASE + '/business-ideas/' + idea.slug + '/pdf', { maxRedirects: 0 });
      assert.equal(r.status(), 200); assert.match(r.headers()['content-type'], /application\/pdf/); previewPdfBytes = (await r.body()).length; assert.ok(previewPdfBytes > 1000);
      const text = await pdfItems(r); assert.ok(text.includes('Get the full plan')); assert.ok(!text.includes('Total'));
    });
    await check('invalid phone gives validation error', async () => {
      await visit(page, '/login'); await page.getByLabel('Phone number').fill('invalid'); await page.getByRole('button', { name: 'Send me a code' }).click();
      await page.getByRole('alert').filter({ hasText: /valid phone number/ }).waitFor();
    });
    if (process.env.OTP_TEST_PHONE && process.env.OTP_TEST_CODE) await check('phone test account signs in through the browser', async () => {
      await visit(page, '/login?callbackUrl=%2Faccount');
      await page.getByLabel('Phone number').fill(process.env.OTP_TEST_PHONE);
      await page.getByRole('button', { name: 'Send me a code' }).click();
      await page.locator('input[name="code"]').fill(process.env.OTP_TEST_CODE);
      await page.waitForURL('**/account', { timeout: 20000 });
      const session = await (await context.request.get(BASE + '/api/auth/session')).json();
      assert.ok(session.user?.id);
      assert.equal(session.user.role, 'USER');
    });
    if (idea && process.env.OTP_TEST_PHONE) await check('member PDF download', async () => {
      const r = await context.request.get(BASE + '/business-ideas/' + idea.slug + '/pdf');
      assert.equal(r.status(), 200); assert.match(r.headers()['content-type'], /application\/pdf/); assert.ok((await r.body()).length > 1000);
      const text = await pdfItems(r); assert.ok(!text.includes('Get the full plan')); assert.ok(text.includes('Total'));
    });
    // Temporary accounts exercise password login, admin pages and editor permission boundaries.
    const password = randomUUID() + '!Aa2';
    const passwordHash = await bcrypt.hash(password, 10);
    for (const role of ['ADMIN', 'EDITOR', 'USER']) {
      const user = await prisma.user.create({ data: { name: 'E2E temporary ' + role, email: 'e2e-' + randomUUID() + '@example.invalid', role, passwordHash, adminAreas: role === 'EDITOR' ? ['homepage'] : [] } });
      accounts.push(user);
    }
    const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await adminContext.addCookies([{ name: 'cookie-notice', value: 'accepted', url: BASE }]);
    const admin = await adminContext.newPage(); watch(admin, 'admin');
    await check('staff password login through browser', async () => {
      await visit(admin, '/login?callbackUrl=%2Fadmin');
      await admin.getByLabel('Email or phone', { exact: true }).fill(accounts[0].email);
      await admin.getByLabel('Password', { exact: true }).fill(password);
      await admin.getByRole('button', { name: 'Log in', exact: true }).click();
      await admin.waitForURL('**/admin', { timeout: 20000 });
      assert.ok(await admin.locator('#admin-shell').count());
    });
    const adminRoutes = ['/admin', '/admin/content', '/admin/prices', '/admin/payments', '/admin/plans', '/admin/categories', '/admin/review', '/admin/corrections', '/admin/users', '/admin/supplier-logins', '/admin/seller-products', '/admin/expert-logins', '/admin/expert-work', '/admin/expert-reviews', '/admin/updates', '/admin/video', '/admin/team'];
    const adminVisit = async (route) => {
      await visit(admin, route);
      assert.ok(new URL(admin.url()).pathname.startsWith('/admin'), route + ': sent to ' + admin.url());
      assert.ok(await admin.locator('#admin-shell').count(), route + ': not inside the admin');
    };
    for (const route of [...adminRoutes, '/admin/forum', '/admin/content/new']) await check('admin page ' + route, () => adminVisit(route));
    for (const type of Object.keys(paths)) await check('admin create form ' + type, () => adminVisit('/admin/content/new?type=' + type));
    if (idea) await check('admin edit form', () => adminVisit('/admin/content/' + idea.id));
    await check('admin payment export', async () => {
      const r = await adminContext.request.get(BASE + '/admin/payments/export'); assert.equal(r.status(), 200); assert.match(r.headers()['content-type'], /csv/);
    });
    await check('admin theme persists', async () => {
      await visit(admin, '/admin'); await admin.getByRole('button', { name: 'Switch to dark mode' }).first().click();
      assert.ok(await admin.locator('#admin-shell.theme-dark').count()); await admin.reload(); assert.ok(await admin.locator('#admin-shell.theme-dark').count());
    });
    for (const user of accounts.slice(1)) {
      const ctx = await browser.newContext();
      await check(user.role + ' password authentication', () => credentialLogin(ctx, user, password));
      await check(user.role + ' cannot open admin team', async () => {
        const r = await ctx.request.get(BASE + '/admin/team', { maxRedirects: 0 });
        if (r.status() === 200) assert.match(await r.text(), /http-equiv="refresh" content="1;url=\/admin/);
        else assert.ok([303, 307].includes(r.status()));
        assert.ok(!(await r.text()).includes('Sign everyone out'));
      });
      if (user.role === 'EDITOR') await check('limited editor can open assigned homepage area', async () => {
        const r = await ctx.request.get(BASE + '/admin/updates'); assert.equal(r.status(), 200);
      });
      if (user.role === 'USER') {
        const userPage = await ctx.newPage(); watch(userPage, 'free user');
        await check('free account can create and delete a collection', async () => {
          await visit(userPage, '/account');
          await userPage.getByRole('textbox', { name: 'New collection name' }).fill('E2E temporary collection');
          await userPage.getByRole('button', { name: 'Create', exact: true }).click();
          const collection = userPage.locator('details').filter({ has: userPage.locator('summary').filter({ hasText: 'E2E temporary collection' }) });
          await collection.locator('summary').waitFor();
          await collection.locator('summary').click();
          await collection.getByRole('button', { name: /Delete/ }).click();
          await collection.waitFor({ state: 'detached' });
          assert.equal(await prisma.collection.count({ where: { userId: user.id } }), 0);
        });
        if (idea) await check('wishlist can save and remove an item', async () => {
          await visit(userPage, '/business-ideas');
          const heart = userPage.getByRole('button', { name: 'Add to wishlist', exact: true }).first();
          await Promise.all([
            userPage.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === '/business-ideas' && r.status() === 200),
            heart.click(),
          ]);
          await userPage.getByRole('button', { name: 'Remove from wishlist', exact: true }).first().waitFor();
          await visit(userPage, '/account');
          assert.equal(await prisma.savedItem.count({ where: { userId: user.id } }), 1);
          await userPage.getByRole('button', { name: 'Remove', exact: true }).first().click();
          await userPage.getByRole('heading', { name: 'Wishlist (0)', exact: true }).waitFor();
          assert.equal(await prisma.savedItem.count({ where: { userId: user.id } }), 0);
        });
        await check('unconfigured payment shows useful error', async () => {
          if (process.env.PESAPAL_CONSUMER_KEY || process.env.PAYMENT_SIMULATE === 'true') return 'skipped: payment integration configured';
          await visit(userPage, '/membership?onboard=pay');
          await userPage.getByRole('button', { name: /Continue/ }).click();
          await userPage.getByText(/Online payments aren't connected yet/).waitFor({ timeout: 15000 });
          assert.equal(await prisma.subscription.count({ where: { userId: user.id, status: 'ACTIVE' } }), 0);
        });
      }
      await ctx.close();
    }
    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    await mobileContext.addCookies([{ name: 'cookie-notice', value: 'accepted', url: BASE }]);
    const mobile = await mobileContext.newPage(); watch(mobile, 'mobile');
    for (const route of ['/', '/business-ideas', '/machines', '/suppliers', '/membership', '/login', '/search?q=bakery', ...(idea ? ['/business-ideas/' + idea.slug] : [])]) {
      await check('mobile layout ' + route, async () => {
        await visit(mobile, route);
        const width = await mobile.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }));
        assert.ok(width.content <= width.viewport + 2, JSON.stringify(width));
      });
    }
    await check('mobile navigation opens and Escape closes', async () => {
      await visit(mobile, '/');
      const menu = mobile.locator('header details').first();
      await menu.locator('summary').click(); assert.ok(await menu.getAttribute('open') !== null);
      await mobile.keyboard.press('Escape'); assert.equal(await menu.getAttribute('open'), null);
    });
    await mobile.goto(BASE + '/'); await mobile.screenshot({ path: path.join(artifacts, 'home-mobile.png'), fullPage: true });
    await page.goto(BASE + '/'); await page.screenshot({ path: path.join(artifacts, 'home-desktop.png'), fullPage: true });
    await check('no uncaught browser or hydration errors', async () => assert.deepEqual(errors, []));
  } finally {
    if (browser) await browser.close();
    for (const user of accounts) {
      const subs = await prisma.subscription.findMany({ where: { userId: user.id }, select: { id: true } });
      await prisma.payment.deleteMany({ where: { subscriptionId: { in: subs.map(s => s.id) } } });
      await prisma.subscription.deleteMany({ where: { userId: user.id } });
      await prisma.savedItem.deleteMany({ where: { userId: user.id } });
      await prisma.collection.deleteMany({ where: { userId: user.id } });
      await prisma.auditLog.deleteMany({ where: { actorId: user.id } });
      await prisma.usageEvent.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
    await prisma.$disconnect();
    fs.writeFileSync(path.join(artifacts, 'e2e-results.json'), JSON.stringify({ results, browserErrors: errors }, null, 2));
    console.log(JSON.stringify({ passed: results.filter(r => r.passed).length, failed: results.filter(r => !r.passed).length }));
    if (results.some(r => !r.passed)) process.exitCode = 1;
  }
})().catch(e => { console.error(e.message); process.exitCode = 1; });

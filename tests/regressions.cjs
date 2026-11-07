const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Execute the real TypeScript modules with isolated service doubles; no database or SMS calls.
function load(file, mocks) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  const context = { module, exports: module.exports, require: name => name in mocks ? mocks[name] : require(name),
    console, process, Date, Request, Response, URL, FormData, AbortSignal, setTimeout };
  vm.runInNewContext(source, context, { filename: file });
  return module.exports;
}

function onboarding(cancelled, settled) {
  const updates = [];
  const payment = { id: 'p1', providerRef: 'tracking1' };
  const actions = load('src/app/actions/onboarding.ts', {
    '@/lib/prisma': { prisma: { payment: {
      findFirst: async () => payment,
      updateMany: async query => { updates.push(query); return { count: 1 }; },
    } } },
    '@/lib/auth': { getSession: async () => ({ user: { id: 'u1' } }) },
    '@/lib/access': {}, '@/lib/billing': { PLAN_PERIODS: ['MONTHLY'] }, '@/lib/audit': {},
    '@/lib/phone-codes': {}, '@/lib/rate-limit': {},
    '@/lib/payments': { cancelOrder: async () => cancelled },
    '@/lib/membership': { settlePayment: async () => settled.shift() ?? 'PENDING' },
  });
  return { actions, updates };
}

test('a number is read from what people naturally type, and unclear ones are refused', () => {
  const { looseNumber, parseField } = load('src/lib/field-parse.ts', { '@prisma/client': { Prisma: { Decimal: String, DbNull: null } } });
  const read = (raw) => { const errors = {}; const v = parseField({ name: 'n', kind: 'decimal' }, looseNumber(raw), errors); return errors.n ? 'refused' : String(v); };
  assert.equal(read('UGX 5,000'), '5000');
  assert.equal(read('10 bags'), '10');
  assert.equal(read('5000/='), '5000');
  assert.equal(read('1,250.50 shillings'), '1250.50');
  for (const unclear of ['5-10', '5k', '2 x 50', 'ask us', '-3']) assert.equal(read(unclear), 'refused', unclear);
});

test('failed provider cancellation keeps payment eligible for settlement', async () => {
  const { actions, updates } = onboarding(false, ['PENDING', 'PENDING']);
  assert.equal(await actions.cancelPayment('p1'), 'PENDING');
  assert.equal(updates.length, 0);
});
test('payment completed during cancellation still succeeds', async () => {
  const { actions, updates } = onboarding(false, ['PENDING', 'SUCCEEDED']);
  assert.equal(await actions.cancelPayment('p1'), 'SUCCEEDED');
  assert.equal(updates.length, 0);
});
test('confirmed provider cancellation cancels local payment', async () => {
  const { actions, updates } = onboarding(true, ['PENDING']);
  assert.equal(await actions.cancelPayment('p1'), 'CANCELLED');
  assert.equal(updates[0].data.status, 'CANCELLED');
});

test('simultaneous correct OTP requests consume the code only once', async () => {
  let exists = true;
  const codes = load('src/lib/phone-codes.ts', {
    './prisma': { prisma: { phoneCode: {
      findFirst: async () => ({ id: 'otp1', attempts: 0, codeHash: 'hash' }),
      deleteMany: async ({ where }) => {
        assert.equal(where.id, 'otp1');
        assert.equal(where.phone, undefined);
        assert.equal(where.attempts.lt, 5);
        const count = exists ? 1 : 0;
        exists = false;
        return { count };
      },
    } } },
    bcryptjs: { compare: async () => true }, './phone': {}, './sms': {}, './rate-limit': {},
  });
  const results = await Promise.all([codes.verifyCode('+256772123456', '123456'), codes.verifyCode('+256772123456', '123456')]);
  assert.equal(results.filter(Boolean).length, 1);
});

test('incorrect OTP does not throw if another request already consumed it', async () => {
  const codes = load('src/lib/phone-codes.ts', {
    './prisma': { prisma: { phoneCode: {
      findFirst: async () => ({ id: 'otp1', attempts: 0, codeHash: 'hash' }),
      updateMany: async () => ({ count: 0 }),
    } } },
    bcryptjs: { compare: async () => false }, './phone': {}, './sms': {}, './rate-limit': {},
  });
  assert.equal(await codes.verifyCode('+256772123456', '000000'), false);
});

function webhook(settlePayment) {
  return load('src/app/api/payments/webhook/route.ts', { '@/lib/membership': { settlePayment } });
}
test('webhook rejects null, arrays and non-string tracking IDs without settling', async () => {
  let calls = 0;
  const route = webhook(async () => { calls++; });
  for (const body of [null, [], { OrderTrackingId: {} }, { OrderTrackingId: '' }]) {
    const res = await route.POST(new Request('https://example.com/api/payments/webhook', { method: 'POST', body: JSON.stringify(body) }));
    assert.equal(res.status, 400);
  }
  assert.equal(calls, 0);
});
test('webhook exposes settlement failure as HTTP 500 for retry', async () => {
  const route = webhook(async () => { throw new Error('temporary outage'); });
  const res = await route.GET(new Request('https://example.com/api/payments/webhook?OrderTrackingId=tracking1'));
  assert.equal(res.status, 500);
  assert.equal((await res.json()).status, 500);
});
test('valid webhook settles and acknowledges payment', async () => {
  let trackingId;
  const route = webhook(async fields => { trackingId = fields.trackingId; return 'SUCCEEDED'; });
  const res = await route.GET(new Request('https://example.com/api/payments/webhook?OrderTrackingId=tracking1'));
  assert.equal(trackingId, 'tracking1');
  assert.equal(res.status, 200);
});

for (const [label, amount, currency, expected] of [
  ['missing amount', null, 'UGX', 'PENDING'],
  ['missing currency', 1000, null, 'PENDING'],
  ['underpayment', 500, 'UGX', 'PENDING'],
  ['wrong currency', 1000, 'USD', 'PENDING'],
  ['non-finite amount', NaN, 'UGX', 'PENDING'],
  ['verified full payment', 1000, 'UGX', 'SUCCEEDED'],
]) {
  test('settlement: ' + label, async () => {
    let applied = false;
    const membership = load('src/lib/membership.ts', {
      './memo': { forgetMemo: () => {} },
      './prisma': { prisma: {
        payment: { findFirst: async () => ({ id: 'p1', status: 'PENDING', providerRef: 'tracking1', amount: 1000, currency: 'UGX', period: 'MONTHLY', subscription: { id: 's1', userId: null, status: 'PAST_DUE' } }) },
        $transaction: async fn => fn({ payment: { updateMany: async () => { applied = true; return { count: 1 }; } }, subscription: { update: async () => ({}) } }),
      } },
      './payments': { orderStatus: async () => ({ status: 'SUCCEEDED', merchantReference: 'p1', amount, currency }) },
      './billing': { periodEnd: () => new Date() }, './audit': { audit: async () => {} },
      './sms': {}, './email': {}, '@/config/site': {}, './format': {},
    });
    assert.equal(await membership.settlePayment({ paymentId: 'p1' }), expected);
    assert.equal(applied, expected === 'SUCCEEDED');
  });
}

for (const [label, start, period, expected] of [
  ['end of month', '2026-01-31T12:34:00Z', 'MONTHLY', '2026-02-28T12:34:00.000Z'],
  ['leap month', '2028-01-31T12:34:00Z', 'MONTHLY', '2028-02-29T12:34:00.000Z'],
  ['leap year renewal', '2028-02-29T12:34:00Z', 'YEARLY', '2029-02-28T12:34:00.000Z'],
  ['six months', '2026-08-31T12:34:00Z', 'HALF_YEARLY', '2027-02-28T12:34:00.000Z'],
  ['two years', '2028-02-29T12:34:00Z', 'TWO_YEARS', '2030-02-28T12:34:00.000Z'],
  ['three years', '2026-11-06T12:34:00Z', 'THREE_YEARS', '2029-11-06T12:34:00.000Z'],
  ['daily duration', '2026-11-04T12:34:00Z', 'DAILY', '2026-11-05T12:34:00.000Z'],
  ['weekly duration', '2026-11-04T12:34:00Z', 'WEEKLY', '2026-11-11T12:34:00.000Z'],
]) {
  test('billing: ' + label, () => {
    const { periodEnd } = load('src/lib/billing.ts', { './format': {} });
    assert.equal(periodEnd(new Date(start), period).toISOString(), expected);
  });
}
for (const raw of ['Infinity', '1e9999', '   ', ',', '0xff']) {
  test('content decimal rejects invalid input: ' + JSON.stringify(raw), () => {
    const { parseField } = load('src/lib/field-parse.ts', {});
    const errors = {};
    assert.equal(parseField({ name: 'price', kind: 'decimal' }, raw, errors), null);
    assert.ok(errors.price);
  });
}
test('content decimal accepts formatted price', () => {
  const { parseField } = load('src/lib/field-parse.ts', {});
  const errors = {};
  assert.equal(parseField({ name: 'price', kind: 'decimal' }, '1,250.50', errors).toString(), '1250.5');
  assert.equal(Object.keys(errors).length, 0);
});

// Texted links must not contain the word "account": it reaches the phone as "a/c", a page that doesn't exist.
test('texted membership link avoids the word account', async () => {
  const texts = [];
  const emails = [];
  const membership = load('src/lib/membership.ts', {
      './memo': { forgetMemo: () => {} },
    './prisma': { prisma: {
      user: { findUnique: async () => ({ phone: '+256700000000', email: 'a@example.invalid', name: 'A' }) },
      alert: { create: async () => ({}) },
    } },
    './payments': {}, './billing': {}, './audit': {}, './format': {},
    './sms': { sendSms: async (_to, text) => { texts.push(text); return true; } },
    './email': { sendEmail: async (_to, _title, text) => { emails.push(text); return true; } },
    '@/config/site': { site: { url: 'https://example.test' } },
  });
  await membership.notifyMember('u1', { title: 'T', text: 'Paid.', link: '/account#membership' });
  assert.equal(texts[0], 'Paid. https://example.test/me#membership');
  assert.match(emails[0], /example\.test\/account#membership/);
  assert.equal(membership.smsLink('/supplier'), '/supplier');
  assert.equal(membership.smsLink('/accounts'), '/accounts');
});

// The live database refused connections: each copy of the site must stay small, and a read must wait and retry.
test('database client limits connections and retries a full database', async () => {
  const saved = { url: process.env.DATABASE_URL, vercel: process.env.VERCEL };
  process.env.DATABASE_URL = 'postgresql://u:p@db.example.test:5432/d';
  process.env.VERCEL = '1';
  delete globalThis.prisma;
  let options;
  class PrismaClient { constructor(o) { options = o; } $extends(c) { return c; } }
  const { prisma } = load('src/lib/prisma.ts', { '@prisma/client': { PrismaClient } });
  delete globalThis.prisma;
  process.env.DATABASE_URL = saved.url;
  if (saved.vercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = saved.vercel;
  assert.equal(new URL(options.datasourceUrl).searchParams.get('connection_limit'), '2');
  let tries = 0;
  const full = () => { tries++; if (tries < 3) throw new Error('Too many database connections opened: FATAL: too many connections for role'); return 'rows'; };
  assert.equal(await prisma.query.$allOperations({ operation: 'findMany', args: {}, query: full }), 'rows');
  assert.equal(tries, 3);
  // Refused at the door, so a save never ran and can try again; a lost connection might have saved, so it can't.
  let saves = 0;
  const refused = () => { saves++; if (saves < 3) throw new Error('Too many database connections opened'); return 'saved'; };
  assert.equal(await prisma.query.$allOperations({ operation: 'create', args: {}, query: refused }), 'saved');
  assert.equal(saves, 3);
  let writes = 0;
  await assert.rejects(prisma.query.$allOperations({ operation: 'create', args: {}, query: () => { writes++; throw new Error('Server has closed the connection'); } }));
  assert.equal(writes, 1);
});

// A paid listing: a new one waits for the team, a lapsed one (already approved) returns at once.
for (const [label, status, expected] of [['new listing', 'PENDING', 'waits'], ['lapsed listing', 'SUSPENDED', 'returns']]) {
  test('listing paid: ' + label + ' ' + expected, async () => {
    const calls = [];
    const membership = load('src/lib/membership.ts', {
      './memo': { forgetMemo: () => {} },
      './prisma': { prisma: {
        organization: { findUnique: async () => ({ status, supplier: { contentItemId: 'c1' }, consultants: [] }), update: q => { calls.push(['org', q.data.status]); return q; } },
        contentItem: { update: q => { calls.push(['item', q.data.publicationStatus]); return q; }, updateMany: async q => { calls.push(['draft', q.where.publicationStatus, q.data.publicationStatus]); return { count: 1 }; } },
        $transaction: async list => list,
      } },
      './payments': {}, './billing': {}, './audit': {}, './sms': {}, './email': {}, '@/config/site': {}, './format': {},
    });
    await membership.partnerPaid('o1');
    assert.deepEqual(JSON.parse(JSON.stringify(calls)), expected === 'waits' ? [['draft', 'DRAFT', 'IN_REVIEW']] : [['org', 'ACTIVE'], ['item', 'PUBLISHED']]);
  });
}

test('a web address typed without https:// is accepted, and a broken one is still refused', () => {
  const { parseField } = load('src/lib/field-parse.ts', { '@prisma/client': { Prisma: { Decimal: String, DbNull: null } } });
  const read = (raw) => { const errors = {}; const v = parseField({ name: 'w', kind: 'url' }, raw, errors); return errors.w ? 'refused' : v; };
  assert.equal(read('www.example.com'), 'https://www.example.com');
  assert.equal(read('example.co.ug/about'), 'https://example.co.ug/about');
  assert.equal(read('https://example.com'), 'https://example.com');
  assert.equal(read('/uploads/profile.pdf'), '/uploads/profile.pdf');
  assert.equal(read('not a website'), 'refused');
  assert.equal(read('name@example.com'), 'refused');
});

test('forum names never show a phone number or email', () => {
  const { shortName } = load('src/lib/forum.ts', {});
  assert.equal(shortName('Martin Venus'), 'Martin V.');
  assert.equal(shortName('Grace'), 'Grace');
  assert.equal(shortName('+256 700 123456'), 'Member');
  assert.equal(shortName('grace@example.com'), 'Member');
  assert.equal(shortName(''), 'Member');
});

test('requests that arrive together share one lookup, and a failed one is not reused', async () => {
  const { shortMemo } = load('src/lib/memo.ts', {});
  let calls = 0;
  const lookup = () => shortMemo('member:u1', 5000, async () => { calls++; return true; });
  const results = await Promise.all(Array.from({ length: 20 }, lookup)); // a page prefetching 20 links
  assert.equal(calls, 1);
  assert.ok(results.every(Boolean));
  let tries = 0;
  const failing = () => shortMemo('member:u2', 5000, async () => { tries++; throw new Error('pool timeout'); });
  await assert.rejects(failing());
  await new Promise((r) => setTimeout(r, 0));
  await assert.rejects(failing());
  assert.equal(tries, 2);
});

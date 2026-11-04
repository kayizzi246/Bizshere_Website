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
    console, process, Date, Request, Response, URL, FormData, AbortSignal };
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

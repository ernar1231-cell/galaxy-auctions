const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const source = fs.readFileSync(path.join(__dirname, '..', 'api', 'account-information.js'), 'utf8');
const botToken = '123456:test-personal-information';
const identity = {id: 987654321, first_name: 'Kolesa', username: 'dubai_kz'};
const clone = value => JSON.parse(JSON.stringify(value));

function signedInitData(user = identity, authDate = Math.floor(Date.now() / 1000)) {
  const values = new URLSearchParams({auth_date: String(authDate), query_id: 'regression-session', user: JSON.stringify(user)});
  const data = [...values.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => key + '=' + value).join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  values.set('hash', crypto.createHmac('sha256', secret).update(data).digest('hex'));
  return values.toString();
}

function server(storage, settings = {}) {
  const requests = [];
  const env = {TELEGRAM_BOT_TOKEN: botToken, SUPABASE_URL: 'https://storage.example.test', SUPABASE_SERVICE_ROLE_KEY: 'regression-key', ...settings.env};
  const fetch = async (url, options = {}) => {
    const parsed = new URL(url), method = options.method || 'GET';
    assert.equal(parsed.origin, 'https://storage.example.test');
    assert.equal(parsed.pathname, '/rest/v1/auction_users');
    const telegramId = parsed.searchParams.get('telegram_id');
    assert.equal(telegramId, 'eq.' + identity.id, 'server must scope every request to the signed Telegram identity');
    const update = options.body ? JSON.parse(options.body) : null;
    requests.push({method, url, update});
    const response = settings.storageError || null;
    if (response) return {ok: false, status: response.status || 500, json: async () => clone(response.body), text: async () => JSON.stringify(response.body)};
    assert.ok(method === 'GET' || method === 'PATCH', 'personal information must never create a second user');
    const exists = storage.user && String(storage.user.telegram_id) === String(identity.id);
    if (method === 'PATCH' && exists) Object.assign(storage.user, update);
    const rows = exists ? [clone(storage.user)] : [];
    return {ok: true, status: 200, json: async () => rows, text: async () => JSON.stringify(rows)};
  };
  const context = {module: {exports: {}}, exports: {}, require: name => {assert.ok(name === 'crypto' || name === 'node:crypto'); return crypto;}, Buffer, URL, URLSearchParams, Date, process: {env}, fetch};
  vm.runInNewContext(source, context, {filename: 'api/account-information.js'});
  const invoke = async (body, method = 'POST') => {
    let code = 200, response;
    const res = {
      setHeader() {},
      status(value) {code = value; return this;},
      json(value) {response = clone(value); return this;},
      end(value) {response = value; return this;}
    };
    await context.module.exports({method, body, headers: {}}, res);
    return {code, body: response};
  };
  return {invoke, requests};
}

function currentUser() {
  return {
    telegram_id: String(identity.id), username: 'dubai_kz', first_name: 'Kolesa', last_name: '',
    deposit_amount: 2000, bid_limit: 2000000, is_admin: true, account_status: 'active',
    email: null, phone: null, phone_country: null, full_name: null, residence_address: null,
    postal_code: null, mailing_address: null, mailing_same_as_residence: false
  };
}

test('all six fields persist in the existing user row and survive a new server session', async () => {
  const storage = {user: currentUser()}, initial = clone(storage.user), api = server(storage);
  const residence = {country: 'United Arab Emirates', region: 'Dubai', city: 'Dubai', street: 'Marina Street 14'};
  const mailing = {country: 'Kazakhstan', region: 'Almaty', city: 'Almaty', street: 'Abay Street 23'};
  const updates = [
    ['email', 'user@example.com'],
    ['phone', {number: '+971 50 123 4567', country: 'AE'}],
    ['full_name', 'Иван Иванов'],
    ['residence_address', residence],
    ['postal_code', 'SW1A 1AA'],
    ['mailing_address', {same_as_residence: false, address: mailing}]
  ];
  for (const [field, value] of updates) {
    const result = await api.invoke({initData: signedInitData(), action: 'update', field, value});
    assert.equal(result.code, 200, field + ': ' + JSON.stringify(result.body));
    assert.ok(result.body.information);
  }
  const reopened = server(storage);
  const result = await reopened.invoke({initData: signedInitData(), action: 'read'});
  assert.equal(result.code, 200);
  const information = result.body.information;
  assert.equal(information.email, 'user@example.com');
  assert.equal(information.phone, '+971501234567');
  assert.equal(information.phone_country, 'AE');
  assert.equal(information.full_name, 'Иван Иванов');
  assert.deepEqual(information.residence_address, residence);
  assert.equal(information.postal_code, 'SW1A 1AA');
  assert.deepEqual(information.mailing_address, mailing);
  assert.equal(information.mailing_same_as_residence, false);
  for (const field of ['telegram_id', 'username', 'first_name', 'last_name', 'deposit_amount', 'bid_limit', 'is_admin', 'account_status']) {
    assert.equal(storage.user[field], initial[field], field + ' must be unchanged');
  }
  for (const request of api.requests.filter(request => request.method === 'PATCH')) {
    assert.ok(Object.keys(request.update).every(field => ['email', 'phone', 'phone_country', 'full_name', 'residence_address', 'postal_code', 'mailing_address', 'mailing_same_as_residence'].includes(field)));
  }
});

test('country selection disambiguates +7 and normalizes national telephone numbers', async () => {
  const storage = {user: currentUser()}, api = server(storage);
  let result = await api.invoke({initData: signedInitData(), action: 'update', field: 'phone', value: {number: '8 (701) 123-45-67', country: 'KZ'}});
  assert.equal(result.code, 200, JSON.stringify(result.body));
  assert.equal(result.body.information.phone, '+77011234567');
  assert.equal(result.body.information.phone_country, 'KZ');
  result = await api.invoke({initData: signedInitData(), action: 'update', field: 'phone', value: {number: '050 123 4567', country: 'AE'}});
  assert.equal(result.code, 200, JSON.stringify(result.body));
  assert.equal(result.body.information.phone, '+971501234567');
  assert.equal(result.body.information.phone_country, 'AE');
  for (const value of [{number: '+971501234567', country: 'KZ'}, {number: '+79161234567', country: 'KZ'}, {number: '123', country: 'AE'}, {number: '+971501234567', country: 'XX'}]) {
    const before = clone(storage.user);
    result = await api.invoke({initData: signedInitData(), action: 'update', field: 'phone', value});
    assert.equal(result.code, 400, JSON.stringify(value));
    assert.deepEqual(storage.user, before);
  }
});
test('mailing address follows residence when selected, including later residence changes', async () => {
  const storage = {user: currentUser()}, api = server(storage);
  const address = {country: 'United Arab Emirates', region: '', city: 'Dubai', street: 'Street 1'};
  await api.invoke({initData: signedInitData(), action: 'update', field: 'residence_address', value: address});
  const result = await api.invoke({initData: signedInitData(), action: 'update', field: 'mailing_address', value: {same_as_residence: true, address: {country: 'Ignored', city: 'Ignored', street: 'Ignored'}}});
  assert.equal(result.code, 200);
  assert.equal(result.body.information.mailing_same_as_residence, true);
  assert.deepEqual(result.body.information.mailing_address, address);
  assert.equal(storage.user.mailing_address, null);
  const moved = {...address, city: 'Abu Dhabi', street: 'Street 2'};
  const updated = await api.invoke({initData: signedInitData(), action: 'update', field: 'residence_address', value: moved});
  assert.equal(updated.code, 200);
  const reopened = await server(storage).invoke({initData: signedInitData(), action: 'read'});
  assert.deepEqual(reopened.body.information.mailing_address, moved);
});

test('validation errors leave saved data untouched; optional fields can be cleared', async () => {
  const storage = {user: currentUser()}, api = server(storage);
  storage.user.email = 'existing@example.com';
  for (const [field, value] of [['email', 'bad-email'], ['email', 'one@two'], ['email', 'two@@example.com'], ['full_name', 'x'.repeat(161)], ['postal_code', 'x'.repeat(33)], ['residence_address', {country: 'UAE', city: 'Dubai'}]]) {
    const before = clone(storage.user), result = await api.invoke({initData: signedInitData(), action: 'update', field, value});
    assert.equal(result.code, 400, field);
    assert.deepEqual(storage.user, before);
  }
  const cleared = await api.invoke({initData: signedInitData(), action: 'update', field: 'email', value: ''});
  assert.equal(cleared.code, 200);
  assert.equal(cleared.body.information.email, null);
});

test('protected account fields cannot be written and a supplied user ID cannot switch identity', async () => {
  const storage = {user: currentUser()}, initial = clone(storage.user), api = server(storage);
  for (const field of ['telegram_id', 'username', 'first_name', 'deposit_amount', 'bid_limit', 'is_admin', 'account_status', '__proto__']) {
    const result = await api.invoke({initData: signedInitData(), action: 'update', field, value: field === 'is_admin' ? false : 'attacker'});
    assert.equal(result.code, 400, field);
  }
  assert.deepEqual(storage.user, initial);
  const result = await api.invoke({initData: signedInitData(), action: 'update', field: 'full_name', value: 'New real name', telegram_id: '111111', user_id: '111111', is_admin: false, deposit_amount: 0});
  assert.equal(result.code, 200);
  assert.equal(storage.user.full_name, 'New real name');
  for (const field of ['telegram_id', 'username', 'deposit_amount', 'bid_limit', 'is_admin']) assert.equal(storage.user[field], initial[field]);
});

test('signed Telegram identity is required, stale sessions fail, and absent users are never inserted', async () => {
  const storage = {user: currentUser()}, api = server(storage);
  const tampered = new URLSearchParams(signedInitData());
  tampered.set('user', JSON.stringify({...identity, id: 111111}));
  for (const initData of ['', tampered.toString(), signedInitData(identity, Math.floor(Date.now() / 1000) - 604801), signedInitData(identity, Math.floor(Date.now() / 1000) + 600)]) {
    const result = await api.invoke({initData, action: 'read'});
    assert.equal(result.code, 401);
  }
  assert.equal(api.requests.length, 0);
  assert.equal((await api.invoke({initData: signedInitData(), action: 'read'}, 'GET')).code, 405);
  const absent = server({user: null});
  for (const action of ['read', 'update']) {
    const result = await absent.invoke({initData: signedInitData(), action, field: 'email', value: 'test@example.com'});
    assert.equal(result.code, 404);
  }
  assert.ok(absent.requests.every(request => request.method !== 'POST'));
});

test('unavailable schema or storage never reports a successful save', async () => {
  for (const body of [{code: '42703', message: 'column auction_users.email does not exist'}, {code: 'XX000', message: 'database unavailable'}]) {
    const storage = {user: currentUser()}, api = server(storage, {storageError: {body}});
    const result = await api.invoke({initData: signedInitData(), action: 'update', field: 'email', value: 'test@example.com'});
    assert.ok(result.code >= 500);
    assert.equal(storage.user.email, null);
  }
});

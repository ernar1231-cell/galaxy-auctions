const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../api/place-bid.js'), 'utf8');
const telegramId = 1001001;
const botToken = 'test-token';

function signedInitData() {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    user: JSON.stringify({id: telegramId, username: 'existing_user'})
  });
  const data = [...params.entries()].sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => key + '=' + value).join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  params.set('hash', crypto.createHmac('sha256', secret).update(data).digest('hex'));
  return params.toString();
}

async function placeBid(options = {}) {
  const user = {
    telegram_id: String(telegramId), username: 'existing_user',
    account_status: 'active', bid_limit: 9000, is_admin: false, phone_country: 'AE',
    ...options.user
  };
  const state = {id: 1, lot_id: 7, current_bid: 2750, status: 'live', phase: 'red', ...options.state};
  const calls = [];
  const response = (data, ok = true) => ({ok, json: async () => JSON.parse(JSON.stringify(data))});
  const sandbox = {
    require: (name) => {
      assert.equal(name, 'crypto');
      return crypto;
    },
    module: {exports: {}}, Buffer, URLSearchParams,
    process: {env: {
      TELEGRAM_BOT_TOKEN: botToken,
      SUPABASE_URL: 'https://database.invalid',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
      OWNER_TELEGRAM_IDS: '999999', ...options.env
    }},
    fetch: async (url, request = {}) => {
      const parsed = new URL(url);
      const method = request.method || 'GET';
      const body = request.body ? JSON.parse(request.body) : undefined;
      calls.push({url: parsed, method, body});
      if (parsed.pathname.endsWith('/auction_users')) {
        assert.equal(method, 'GET');
        assert.equal(parsed.searchParams.get('telegram_id'), 'eq.' + telegramId);
        return options.lookupFailed ? response({message: 'Database unavailable'}, false) : response([user]);
      }
      if (parsed.pathname.endsWith('/auction_state')) {
        if (method === 'GET') return response([state]);
        assert.equal(method, 'PATCH');
        return response(options.concurrentBid ? [] : [{...state, ...body}]);
      }
      assert.ok(parsed.pathname.endsWith('/auction_bids'));
      assert.equal(method, 'POST');
      return response([{id: 10, ...body}]);
    }
  };
  vm.runInNewContext(source, sandbox, {filename: 'api/place-bid.js'});
  let status, payload;
  const res = {
    status(code) {status = code; return this;},
    json(data) {payload = JSON.parse(JSON.stringify(data)); return this;}
  };
  await sandbox.module.exports({
    method: 'POST',
    body: {initData: options.initData ?? signedInitData(), lotId: 7, increment: 1000, userId: 'untrusted'}
  }, res);
  return {status, payload, calls, user};
}

const writes = result => result.calls.filter(call => call.method !== 'GET');

test('existing administrator with a positive stored limit can bid despite pending account status', async () => {
  const result = await placeBid({user: {is_admin: true, account_status: 'pending', bid_limit: '9000'}});
  assert.equal(result.status, 200);
  assert.equal(result.payload.state.current_bid, 3750);
  assert.equal(result.payload.bid.user_id, String(telegramId));
  assert.equal(result.payload.bid.username, 'existing_user');
  assert.equal(result.payload.bid.country, 'AE');
  assert.equal(result.user.bid_limit, '9000');
  const [update, insert] = writes(result);
  assert.equal(writes(result).length, 2);
  assert.ok(update.url.pathname.endsWith('/auction_state'));
  assert.equal(update.url.searchParams.get('current_bid'), 'eq.2750');
  assert.equal(update.url.searchParams.get('lot_id'), 'eq.7');
  assert.equal(update.url.searchParams.get('status'), 'eq.live');
  assert.equal(update.body.phase, 'red');
  assert.ok(insert.url.pathname.endsWith('/auction_bids'));
  assert.equal(insert.body.amount, 3750);
});

test('existing configured owner uses the same admin eligibility rule', async () => {
  for (const env of [
    {OWNER_TELEGRAM_IDS: '999999, ' + telegramId},
    {OWNER_TELEGRAM_IDS: '', OWNER_TELEGRAM_ID: String(telegramId)}
  ]) {
    const result = await placeBid({env, user: {account_status: 'pending'}});
    assert.equal(result.status, 200);
  }
});

test('blocked administrators and owners remain unable to bid', async () => {
  for (const options of [
    {user: {is_admin: true, account_status: 'blocked'}},
    {env: {OWNER_TELEGRAM_IDS: String(telegramId)}, user: {account_status: 'BLOCKED'}}
  ]) {
    const result = await placeBid(options);
    assert.equal(result.status, 403);
    assert.equal(result.payload.code, 'BLOCKED');
    assert.equal(writes(result).length, 0);
  }
});

test('admin status never grants a missing, nonpositive or invalid bid limit', async () => {
  for (const bid_limit of [null, 0, -1, 'invalid', 'Infinity']) {
    const result = await placeBid({user: {is_admin: true, account_status: 'pending', bid_limit}});
    assert.equal(result.status, 403);
    assert.equal(result.payload.code, 'DEPOSIT_REQUIRED');
    assert.equal(writes(result).length, 0);
  }
});

test('ordinary active participants keep access and pending participants still require activation', async () => {
  const active = await placeBid();
  assert.equal(active.status, 200);
  const pending = await placeBid({user: {account_status: 'pending'}});
  assert.equal(pending.status, 403);
  assert.equal(pending.payload.code, 'DEPOSIT_REQUIRED');
  assert.equal(writes(pending).length, 0);
});

test('account read failures are not reported as missing deposit activation', async () => {
  const result = await placeBid({lookupFailed: true});
  assert.equal(result.status, 502);
  assert.equal(result.payload.code, 'ACCOUNT_LOOKUP_FAILED');
  assert.equal(writes(result).length, 0);
});

test('administrator bids still respect the real stored bid limit', async () => {
  const result = await placeBid({user: {is_admin: true, account_status: 'pending', bid_limit: 3000}});
  assert.equal(result.status, 403);
  assert.equal(result.payload.code, 'LIMIT_EXCEEDED');
  assert.equal(result.payload.bidLimit, 3000);
  assert.equal(result.payload.nextBid, 3750);
  assert.equal(writes(result).length, 0);
});

test('concurrent bid rejection keeps the existing compare-and-set flow without duplicate history', async () => {
  const result = await placeBid({concurrentBid: true});
  assert.equal(result.status, 409);
  assert.equal(writes(result).length, 1);
  assert.ok(writes(result)[0].url.pathname.endsWith('/auction_state'));
});

test('nonlive lots are still rejected before any writes', async () => {
  const result = await placeBid({state: {status: 'waiting'}});
  assert.equal(result.status, 409);
  assert.equal(writes(result).length, 0);
});

test('invalid Telegram initData still fails before account lookup', async () => {
  const params = new URLSearchParams(signedInitData());
  params.set('user', JSON.stringify({id: 2002002}));
  const result = await placeBid({initData: params.toString()});
  assert.equal(result.status, 401);
  assert.equal(result.calls.length, 0);
});

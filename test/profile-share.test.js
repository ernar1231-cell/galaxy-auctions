const test=require('node:test');
const assert=require('node:assert/strict');
const {launchToken}=require('../api/share');
const {bucketForStatus,saleMeta}=require('../api/my-auction-results');

test('share launch token is URL-safe and round-trips an opaque lot id',()=>{
  const id='0d88fef1-23ab-4bcd-9123-abcdef123456';
  const token=launchToken(id);
  assert.match(token,/^[A-Za-z0-9_-]+$/);
  assert.equal(Buffer.from(token,'base64url').toString('utf8'),id);
});

test('my cars buckets reflect authoritative lot status',()=>{
  assert.equal(bucketForStatus('pending'),'pending');
  assert.equal(bucketForStatus('sold'),'tracking');
  assert.equal(bucketForStatus('upcoming'),null);
});

test('winner sale metadata remains compatible with encoded auction descriptions',()=>{
  const sale={user_id:'123',price:4800};
  const encoded=Buffer.from(JSON.stringify(sale)).toString('base64url');
  assert.deepEqual(saleMeta(`notes\n[[sale:${encoded}]]`),sale);
});

const {parseStart}=require('../api/telegram-webhook');
test('Telegram bot restores lot intent and routes LIVE directly',()=>{
  assert.deepEqual(parseStart('/start live'),{type:'live',param:'live'});
  assert.deepEqual(parseStart('/start lot_YWJjLTEyMw'),{type:'lot',param:'lot_YWJjLTEyMw'});
  assert.deepEqual(parseStart('/start lot_bad value'),{type:'home',param:''});
});

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

const {appUrl}=require('../api/telegram-webhook');
test('share → bot → Mini App preserves the exact lot for new and returning users',()=>{
  const old=process.env.TELEGRAM_WEB_APP_URL;
  process.env.TELEGRAM_WEB_APP_URL='https://app.example.test/';
  try{
    const lotId='vehicle-35-is-not-special',start=`lot_${launchToken(lotId)}`;
    const botIntent=parseStart(`/start ${start}`);
    assert.equal(botIntent.param,start);
    assert.equal(new URL(appUrl(botIntent.param)).searchParams.get('tgWebAppStartParam'),start);
    assert.equal(Buffer.from(start.slice(4),'base64url').toString('utf8'),lotId);
    for(const registered of [false,true]) assert.equal(botIntent.type,'lot',`registered=${registered}`);
  }finally{if(old===undefined)delete process.env.TELEGRAM_WEB_APP_URL;else process.env.TELEGRAM_WEB_APP_URL=old}
});

test('LIVE button URL carries an idempotent launch intent',()=>{
  const old=process.env.TELEGRAM_WEB_APP_URL;
  process.env.TELEGRAM_WEB_APP_URL='https://app.example.test/';
  try{
    const first=new URL(appUrl('live'));
    const reopened=new URL(appUrl('live'));
    assert.equal(first.searchParams.get('tgWebAppStartParam'),'live');
    assert.equal(reopened.href,first.href);
  }finally{if(old===undefined)delete process.env.TELEGRAM_WEB_APP_URL;else process.env.TELEGRAM_WEB_APP_URL=old}
});

const {editableProfile}=require('../api/profile');
test('profile update validates and persists only editable profile metadata',()=>{
  const patch=editableProfile({firstName:' Aisha ',lastName:'K',email:'AISHA@EXAMPLE.COM',phone:'+971501234567',phoneCountry:'ae',language:'ar',avatarUrl:'data:image/webp;base64,AAAA'});
  assert.equal(patch.first_name,'Aisha');
  assert.equal(patch.email,'aisha@example.com');
  assert.equal(patch.phone_country,'AE');
  assert.equal(patch.country,'AE');
  assert.equal(patch.language,'ar');
  for(const protectedField of ['deposit_amount','bid_limit','account_status','is_admin','telegram_id']) assert.equal(Object.hasOwn(patch,protectedField),false);
});

test('profile update rejects unsupported languages and invalid phone numbers',()=>{
  assert.throws(()=>editableProfile({firstName:'A',phoneCountry:'AE',language:'de'}),/Некорректный язык/);
  assert.throws(()=>editableProfile({firstName:'A',phoneCountry:'AE',phone:'050123',language:'ru'}),/международном формате/);
});

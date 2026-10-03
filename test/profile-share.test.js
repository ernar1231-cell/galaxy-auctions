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

const {editableProfile,profileFields}=require('../api/profile');
test('profile reads established account data without depending on optional language migration',()=>{
  for(const field of ['username','first_name','last_name','email','phone','phone_country','avatar_url','country','deposit_amount','bid_limit','account_status','created_at','is_admin']) assert.ok(profileFields.split(',').includes(field),field);
  assert.equal(profileFields.split(',').includes('language'),false);
});
test('authenticated profile response preserves real account values and admin role',async()=>{
  const crypto=require('crypto'),handler=require('../api/profile'),token='test-token',user={id:777,username:'existing_user',first_name:'Existing'};
  const params=new URLSearchParams({auth_date:'1700000000',query_id:'test',user:JSON.stringify(user)});
  const data=[...params].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join('\n');
  const secret=crypto.createHmac('sha256','WebAppData').update(token).digest();
  params.set('hash',crypto.createHmac('sha256',secret).update(data).digest('hex'));
  const profile={telegram_id:'777',username:'existing_user',first_name:'Existing',last_name:'Account',email:'real@example.com',phone:'+971501234567',phone_country:'AE',avatar_url:'https://example.test/avatar.jpg',country:'AE',deposit_amount:5000,bid_limit:25000,account_status:'active',created_at:'2025-01-02T00:00:00Z',is_admin:true};
  const oldToken=process.env.TELEGRAM_BOT_TOKEN,oldKey=process.env.SUPABASE_SERVICE_ROLE_KEY,oldFetch=global.fetch;
  process.env.TELEGRAM_BOT_TOKEN=token;process.env.SUPABASE_SERVICE_ROLE_KEY='service-key';
  global.fetch=async url=>{assert.match(String(url),/telegram_id=eq\.777/);return{ok:true,json:async()=>[profile]}};
  let status,body;
  try{await handler({method:'GET',headers:{'x-telegram-init-data':params.toString()}},{status(code){status=code;return this},json(value){body=value;return this}})}finally{
    global.fetch=oldFetch;if(oldToken===undefined)delete process.env.TELEGRAM_BOT_TOKEN;else process.env.TELEGRAM_BOT_TOKEN=oldToken;if(oldKey===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=oldKey;
  }
  assert.equal(status,200);assert.deepEqual(body.profile,profile);
});
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

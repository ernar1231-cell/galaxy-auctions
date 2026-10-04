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

const fs=require('node:fs');
const path=require('node:path');
const source=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

test('profile uses the pre-redesign Telegram account data path',()=>{
  const app=source('app.js');
  const html=source('index.html');
  assert.match(app,/const tgUser=tg\?\.initDataUnsafe\?\.user \|\| null/);
  assert.match(app,/register_telegram_user/);
  assert.match(app,/from\("auction_users"\)\.select\("telegram_id,username,first_name,last_name,deposit_amount,deposit_method,bid_limit,account_status,deposit_updated_at,is_admin"\)\.eq\("telegram_id",String\(tgUser\.id\)\)\.single\(\)/);
  assert.match(html,/id="openAccountFromProfile"/);
  assert.match(html,/Мой аккаунт/);
  assert.doesNotMatch(html,/id="profileEditOverlay"|profileHeroCard/);
  assert.doesNotMatch(app,/saveOwnProfile|\/api\/profile/);
});

test('admin entry uses verified role access and opens the existing panel',()=>{
  const app=source('app.js');
  const access=source('api/admin-access.js');
  const html=source('index.html');
  assert.match(app,/fetch\("\/api\/admin-access"/);
  assert.match(app,/const show=!!adminAccess\.admin/);
  assert.match(app,/\$\("openAdminFromProfile"\)\.onclick=\(\)=>\{closeModernScreens\(\);openAdminPanel\(\)\}/);
  assert.match(access,/verifyTelegram\(req\.body\?\.initData/);
  assert.match(access,/is_admin=eq\.true/);
  assert.match(html,/id="adminOverlay"/);
  assert.match(html,/id="openAdminFromProfile"/);
});

test('top profile card preserves contact, language and verification controls',()=>{
  const app=source('app.js');
  const html=source('index.html');
  const card=html.match(/<section class="profileTop profileContactCard">.*?<\/section>/)?.[0];
  assert.ok(card);
  for(const id of ['modernProfileAvatar','modernProfileName','modernProfileUser','modernProfileStatus','profileEdit','profilePhoneRow','profileEmailRow','profileLanguageRow'])assert.match(card,new RegExp(`id="${id}"`));
  for(const language of ['ru','en','ar'])assert.match(html,new RegExp(`data-profile-language="${language}"`));
  assert.match(card,/data-info="Верификация/);
  assert.match(app,/setProfileAvatar\(\$\("modernProfileAvatar"\),d,name\)/);
  assert.match(app,/function openProfileAccount\(\)\{closeModernScreens\(\);openAccount\(\)\}/);
  assert.match(app,/localStorage\.setItem\(profileLanguageKey\(\),code\)/);
  assert.doesNotMatch(app,/saveProfilePatch|loadEditableProfile/);
});

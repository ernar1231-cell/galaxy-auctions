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

test('profile keeps the proven Telegram account data path for balances and identity',()=>{
  const app=source('app.js');
  const html=source('index.html');
  assert.match(app,/const tgUser=tg\?\.initDataUnsafe\?\.user \|\| null/);
  assert.match(app,/register_telegram_user/);
  assert.match(app,/from\(['"]auction_users['"]\)\.select\(['"]telegram_id,username,first_name,last_name,deposit_amount,deposit_method,bid_limit,account_status,deposit_updated_at,is_admin['"]\)\.eq\(['"]telegram_id['"],String\(tgUser\.id\)\)\.single\(\)/);
  assert.match(html,/id="modernProfileDeposit"/);
  assert.match(html,/id="modernProfileLimit"/);
  assert.match(html,/id="openAccountFromProfile"/);
  assert.match(html,/id="openAdminFromProfile"/);
});

test('top profile card has persistent edit, contact, language and verification controls',()=>{
  const app=source('app.js');
  const html=source('index.html');
  for(const id of ['profileEdit','profilePhoneRow','profileEmailRow','profileLanguageRow','profileEditOverlay','profilePhoto','profileSave'])assert.match(html,new RegExp(`id="${id}"`));
  assert.match(html,/data-profile-language="ru"/);
  assert.match(html,/data-profile-language="en"/);
  assert.match(html,/data-profile-language="ar"/);
  assert.match(html,/data-info="Верификация/);
  assert.match(app,/saveProfilePatch/);
  assert.match(app,/avatarUrl:pendingProfileAvatar/);
  assert.match(app,/loadEditableProfile\(\)/);
});

test('profile API keeps main authentication and lookup contract',()=>{
  const api=source('api/profile.js');
  assert.match(api,/req\.method==='POST'\?req\.body\?\.initData:req\.headers\['x-telegram-init-data'\]/);
  assert.match(api,/auction_users\?telegram_id=eq\.\$\{encodeURIComponent\(String\(user\.id\)\)\}/);
  assert.match(api,/deposit_amount,bid_limit,account_status,created_at,is_admin/);
  assert.match(api,/function profilePatch/);
  assert.doesNotMatch(api,/telegram_id:|deposit_amount:|bid_limit:|is_admin:/);
});


test('personal information page exposes editable controls and save/cancel actions',()=>{
  const html=source('index.html'),app=source('app.js');
  for(const id of ['accountOverlay','personalEmail','personalPhone','personalFullName','personalResidential','personalPostalCode','personalMailing','personalEditSave','personalEditCancel','personalMailingSame'])assert.match(html,new RegExp(`id="${id}"`));
  for(const key of ['email','phone','fullName','residential','postalCode','mailing'])assert.match(html,new RegExp(`data-personal-edit="${key}"`));
  assert.match(app,/openPersonalEditor/);
  assert.match(app,/savePersonalInfo/);
  assert.match(app,/renderPersonalInfo/);
  assert.match(app,/syncModernProfile\(\)/);
});

test('personal information patch validates and preserves protected account fields',()=>{
  const {profilePatch}=require('../api/profile');
  const patch=profilePatch({email:'USER@example.com',phone:'+971 50 123 4567',phoneCountry:'AE',fullName:'Test Person',residentialCountry:'United Arab Emirates',residentialCity:'Dubai',residentialRegion:'Dubai',residentialAddress:'Street 1',postalCode:'A1B 2C3',mailingAddress:'PO Box 10',mailingSame:false});
  assert.equal(patch.email,'user@example.com');
  assert.equal(patch.phone,'+971501234567');
  assert.equal(patch.first_name,'Test');
  assert.equal(patch.last_name,'Person');
  assert.equal(patch.residential_city,'Dubai');
  assert.equal(patch.postal_code,'A1B 2C3');
  assert.equal(patch.mailing_address,'PO Box 10');
  for(const protectedField of ['telegram_id','username','deposit_amount','bid_limit','is_admin'])assert.equal(Object.hasOwn(patch,protectedField),false);
  assert.throws(()=>profilePatch({email:'not-an-email'}),/Некорректный email/);
  assert.throws(()=>profilePatch({phone:'123',phoneCountry:'AE'}),/международном формате/);
});

test('mailing address can reuse the persisted residential address',()=>{
  const {profilePatch}=require('../api/profile');
  const patch=profilePatch({mailingAddress:'ignored',mailingSame:true});
  assert.equal(patch.mailing_same_as_residential,true);
  assert.equal(patch.mailing_address,null);
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
});

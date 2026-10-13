'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refresh=fs.readFileSync(path.join(root,'direction-state-refresh.js'),'utf8');
const catalog=fs.readFileSync(path.join(root,'direction-catalog.js'),'utf8');
const sql=fs.readFileSync(path.join(root,'migrations/20261013_dubai_demo_allow_telegram_users.sql'),'utf8');
test('Telegram webview fetches fresh demo scripts',()=>{
 assert.match(index,/direction-catalog\.js\?v=261/);
 assert.match(index,/direction-state-refresh\.js\?v=268/);
});
test('main bid button is labeled as demo and routes only to demo endpoint',()=>{
 assert.match(refresh,/liveButton\.textContent='ТЕСТ \+\$100'/);
 assert.match(refresh,/directionDemoBid100'\)\?\.click\(\)/);
 assert.match(refresh,/panel\.dataset\.demoMode='true'/);
 assert.match(refresh,/clock\.textContent='ТЕСТ '\+money\(data\.currentBid\)/);
 assert.match(catalog,/screen\.dataset\.demoMode==='true'/);
});
test('pending users may test only isolated demo, not real auctions',()=>{
 assert.doesNotMatch(sql,/account_status/);
 assert.doesNotMatch(sql,/\b(?:UPDATE|INSERT INTO|DELETE FROM)\s+public\.(?:galaxy_auction_sessions|galaxy_auction_bid_events)\b/i);
 assert.match(sql,/galaxy_demo_bid/);
});

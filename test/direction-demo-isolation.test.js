'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const sql=fs.readFileSync(path.join(__dirname,'../migrations/20261013_dubai_demo_isolated.sql'),'utf8');
const api=fs.readFileSync(path.join(__dirname,'../api/direction-demo-bid.js'),'utf8');
test('demo is isolated from real bid, SOLD and auction sessions',()=>{
 assert.doesNotMatch(sql,/\b(?:UPDATE|INSERT INTO|DELETE FROM)\s+public\.(?:galaxy_auction_sessions|galaxy_auction_bid_events|galaxy_auction_results|auction_bids)\b/i);
 assert.match(sql,/galaxy_demo_lot_state/);
 assert.match(sql,/galaxy_demo_proxy_maxima/);
 assert.match(sql,/galaxy_demo_bid_events/);
});
test('demo API requires explicit flag, Telegram login and exact Dubai lot',()=>{
 assert.match(api,/GALAXY_DUBAI_DEMO_ENABLED/);
 assert.match(api,/verifyTelegram/);
 assert.match(api,/spec\.lot/);
 assert.doesNotMatch(api,/rpc\/galaxy_direction_submit_bid/);
});
test('only active accounts can place demo bids',()=>{
 assert.match(sql,/lower\(coalesce\(u\.account_status,''\)\)='active'/);
 assert.match(sql,/FOR UPDATE/);
});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const api=fs.readFileSync(path.join(root,'api/direction-demo-bid.js'),'utf8');
const ui=fs.readFileSync(path.join(root,'direction-demo-proxy-both.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sql=fs.readFileSync(path.join(root,'migrations/20261013_transit_demo_isolated.sql'),'utf8');
test('dual demo only routes to isolated tables and RPCs',()=>{
 assert.match(api,/galaxy_demo_bid/);assert.match(api,/galaxy_transit_demo_bid/);
 assert.match(api,/verifyTelegram/);assert.match(api,/spec\.rpc/);
 assert.doesNotMatch(sql,/\b(?:UPDATE|INSERT INTO|DELETE FROM)\s+public\.(?:galaxy_auction_sessions|galaxy_auction_bid_events|auction_bids)\b/i);
});
test('Telegram demo buttons support manual and proxy in both directions',()=>{
 assert.match(ui,/dubai:\{lot:69/);assert.match(ui,/transfer:\{lot:70/);
 assert.match(ui,/ТЕСТ PROXY/);assert.match(ui,/data-amount="1000"/);
 assert.match(ui,/window\.Telegram\?\.WebApp\?\.initData/);
 assert.match(ui,/setInterval\(poll,500\)/);
 assert.doesNotMatch(ui,/\/api\/direction-place-bid|\/api\/direction-set-proxy-max/);
 assert.match(html,/direction-demo-proxy-both\.js\?v=274/);
});

test('cross-direction stale demo responses are rejected',()=>{
 assert.match(ui,/root\.dataset\.demoDirection/);
 assert.match(ui,/data\.direction!==requestDirection/);
 assert.match(ui,/context\(\)\?\.lot!==ctx\.lot/);
});

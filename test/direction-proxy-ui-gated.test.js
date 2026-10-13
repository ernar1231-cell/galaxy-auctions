'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const state=fs.readFileSync(path.join(__dirname,'../api/direction-live-state.js'),'utf8');
const refresh=fs.readFileSync(path.join(__dirname,'../direction-state-refresh.js'),'utf8');
test('proxy controls require active bids and both server readiness gates',()=>{
 assert.match(state,/proxyAvailable=biddingAvailable&&process\.env\.GALAXY_DIRECTION_PROXY_ENABLED==='true'&&process\.env\.GALAXY_DIRECTION_UNIFIED_BIDS_READY==='true'/);
 assert.match(refresh,/proxyAllowed=bidAllowed&&state\.proxyAvailable===true/);
});
test('proxy maximum is submitted only for currently visible lot with Telegram initData',()=>{
 assert.match(refresh,/panel\.dataset\.visibleLotNumber!==String\(lot\)/);
 assert.match(refresh,/window\.Telegram\?\.WebApp\?\.initData/);
 assert.match(refresh,/direction:d,lotNumber,maximum,initData/);
});
test('expired phase disables proxy controls',()=>{
 assert.match(refresh,/if\(remaining===0\)/);
 assert.match(refresh,/if\(proxySubmit\)proxySubmit\.disabled=true/);
});

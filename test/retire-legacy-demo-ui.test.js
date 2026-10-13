'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),refresh=fs.readFileSync(path.join(root,'direction-state-refresh.js'),'utf8');
test('normal auction no longer loads legacy green test controls',()=>{
 assert.doesNotMatch(html,/src="direction-demo-standalone\.js/);
 assert.doesNotMatch(html,/src="direction-demo-proxy-both\.js/);
 assert.match(refresh,/demoAvailable=false;/);
 assert.match(refresh,/if\(old\)old\.hidden=true/);
});
test('real bidding still requires server enablement and USA API remains separate',()=>{
 const bid=fs.readFileSync(path.join(root,'api/direction-place-bid.js'),'utf8');
 assert.match(bid,/GALAXY_DIRECTION_BIDDING_ENABLED/);
 assert.match(bid,/if\(direction==='usa'\)/);
 assert.match(bid,/verifyTelegram/);
});

'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../api/direction-place-bid.js'),'utf8');
test('Dubai/Transit manual bid increments are exactly 100 or 1000',()=>{
 assert.match(source,/const increment=req\.body\?\.increment;/);
 assert.match(source,/!\[100,1000\]\.includes\(increment\)/);
 assert.doesNotMatch(source,/\[100,1000,10000\]/);
});
test('manual bid still requires server flag, signed Telegram and atomic RPC',()=>{
 assert.match(source,/GALAXY_DIRECTION_BIDDING_ENABLED/);
 assert.match(source,/verifyTelegram/);
 assert.match(source,/galaxy_direction_submit_bid/);
 assert.match(source,/direction==='usa'/);
});

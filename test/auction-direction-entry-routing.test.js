'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const src=fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8');
test('Telegram live entry shows the three-direction selector',()=>{
 assert.match(src,/registrationDestination=intent\.live\?'directions'/);
 assert.match(src,/registrationDestination==='directions'\)\{openAuctionDirectionScreen\(\)/);
});
test('USA live route remains existing and Dubai Transit routes remain distinct',()=>{
 assert.match(src,/\$\("auctionDirectionUSA"\)\.onclick=enterAuctionMarkets/);
 assert.match(src,/galaxyOpenDirectionCatalog\?\.\('dubai'\)/);
 assert.match(src,/galaxyOpenDirectionCatalog\?\.\('transfer'\)/);
});

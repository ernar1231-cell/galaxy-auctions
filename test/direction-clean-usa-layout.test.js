'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const css=fs.readFileSync(path.join(__dirname,'../direction-catalog.css'),'utf8');
const ui=fs.readFileSync(path.join(__dirname,'../direction-catalog.js'),'utf8');
test('Dubai Transit hide only extra notices, retaining bid controls and guards',()=>{
 assert.match(css,/#directionCatalogScreen \.directionLiveNotice/);
 assert.match(css,/#directionCatalogScreen #directionDemoPanel/);
 assert.match(ui,/id="directionBidSubmit" disabled/);
 assert.match(ui,/id="directionBidPlus" disabled/);
 assert.match(ui,/id="directionBidMinus" disabled/);
});

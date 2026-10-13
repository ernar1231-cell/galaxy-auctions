'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../direction-state-refresh.js'),'utf8');
test('null active lot invalidates prior lot and removes stale results',()=>{
 assert.match(src,/if\(lotNumber!==lot\)\{/);
 assert.match(src,/panel\.querySelector\('#directionPublicHistory'\)\?\.remove\(\)/);
 assert.match(src,/panel\.querySelector\('#directionPublicResult'\)\?\.remove\(\)/);
});
test('missing visible lot identifier never enables bid controls',()=>{
 assert.match(src,/panel\.dataset\.visibleLotNumber===String\(lotNumber\)/);
 assert.match(src,/panel\.dataset\.visibleLotNumber!==String\(lot\)/);
});

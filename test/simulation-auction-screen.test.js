'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../simulation.html'),'utf8');
const js=fs.readFileSync(path.join(__dirname,'../simulation-auction.js'),'utf8');
test('simulation has three directions and five-lot clock without modifying main USA LIVE',()=>{
 for(const d of ['usa','dubai','transfer'])assert.match(html,new RegExp('data-direction="'+d+'"'));
 assert.match(html,/Лот — из 5/);
 assert.match(js,/\/api\/simulation-state/);
 assert.doesNotMatch(js,/\/api\/(?:place-bid|direction-place-bid|direction-demo-bid|direction-set-proxy-max)/);
});
test('clear simulated status and no active bid buttons',()=>{
 assert.match(html,/СИМУЛЯЦИЯ · НЕТ РЕАЛЬНЫХ СТАВОК И ПОКУПОК/);
 assert.match(html,/class="primary" disabled/);
 assert.match(html,/simulation-auction\.js\?v=277/);
});
test('stale direction responses are ignored',()=>{
 assert.match(js,/mySeq!==seq\|\|d!==direction/);
 assert.match(js,/data\.direction!==d/);
});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const catalog=fs.readFileSync(path.join(__dirname,'../direction-catalog.js'),'utf8');
const refresh=fs.readFileSync(path.join(__dirname,'../direction-state-refresh.js'),'utf8');
test('demo UI is explicitly labeled and hidden until server reports enabled',()=>{
 assert.match(catalog,/id="directionDemoPanel"[^>]*hidden/);
 assert.match(catalog,/ТЕСТ — НЕ НАСТОЯЩИЙ АУКЦИОН/);
 assert.match(catalog,/Не создают SOLD/);
});
test('demo is restricted to Dubai lot 69 and uses isolated API',()=>{
 assert.match(refresh,/direction!=='dubai'/);
 assert.match(refresh,/panel\.dataset\.visibleLotNumber!=='69'/);
 assert.match(refresh,/fetch\('\/api\/direction-demo-bid'/);
 assert.match(refresh,/mode,amount,initData/);
});
test('live auction bid controls remain independent of demo',()=>{
 assert.match(refresh,/fetch\('\/api\/direction-place-bid'/);
 assert.match(refresh,/fetch\('\/api\/direction-set-proxy-max'/);
 assert.match(refresh,/demoAvailable=false/);
});

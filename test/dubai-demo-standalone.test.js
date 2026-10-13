'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const js=fs.readFileSync(path.join(root,'direction-demo-standalone.js'),'utf8');
test('standalone demo controller is loaded and uses isolated endpoint only',()=>{
 assert.match(html,/direction-demo-standalone\.js\?v=261/);
 assert.match(js,/id='dubaiDemoQuickBid'/);
 assert.match(js,/\/api\/direction-demo-bid/);
 assert.doesNotMatch(js,/\/api\/direction-place-bid|\/api\/direction-set-proxy-max/);
});
test('demo button requires Dubai lot 69 and Telegram login',()=>{
 assert.match(js,/visibleLotNumber!=='69'/);
 assert.match(js,/\.includes\('Дубай'\)/);
 assert.match(js,/window\.Telegram\?\.WebApp\?\.initData/);
});

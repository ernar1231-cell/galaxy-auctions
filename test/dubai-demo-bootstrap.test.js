'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../direction-state-refresh.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
test('open Dubai catalog bootstraps demo even when click was missed',()=>{
 assert.match(src,/title\.includes\('Дубай'\)/);
 assert.match(src,/await refreshDemo\(initialPanel,'dubai','69'\)/);
});
test('live state refresh does not re-disable demo button',()=>{
 assert.match(src,/if\(demoAvailable&&d==='dubai'&&panel\.dataset\.visibleLotNumber==='69'\)/);
 assert.match(src,/button\.textContent='ТЕСТ \+\$100'/);
});
test('Telegram cache version incremented',()=>{
 assert.match(html,/direction-state-refresh\.js\?v=268/);
});

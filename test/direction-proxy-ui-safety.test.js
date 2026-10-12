'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const catalog=fs.readFileSync(path.join(__dirname,'../direction-catalog.js'),'utf8');
test('proxy maximum input is present but safely disabled until atomic settlement',()=>{
 assert.match(catalog,/id="directionProxyMaximum"[^>]*disabled/);
 assert.match(catalog,/id="directionProxySubmit"[^>]*disabled/);
 assert.match(catalog,/До проверки серверной обработки отправка отключена/);
});

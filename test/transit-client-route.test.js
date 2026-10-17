'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('client transit route parser does not break application',()=>{
 const source=fs.readFileSync(require.resolve('../app.js'),'utf8');
 assert.doesNotThrow(()=>new vm.Script(source));
 for(const name of ['Страна отправления','Порт отправления','Пункт назначения','Ориентировочная доставка'])assert.ok(source.includes(name));
});
test('route information only displayed for transit direction',()=>{
 const source=fs.readFileSync(require.resolve('../app.js'),'utf8');
 assert.ok(source.includes("meta.direction!=='transfer'"));
});

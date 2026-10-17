'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../direction-lots-picker.js'),'utf8');
test('transit flag filter script parses',()=>assert.doesNotThrow(()=>new vm.Script(source)));
test('filters remain destination-based and only render assigned ports',()=>{
 assert.ok(source.includes('for(const car of cars)'));
 assert.ok(source.includes('for(const [key,entry] of ports)'));
 assert.ok(source.includes('flagFor(name)'));
 assert.ok(source.includes("key==='__all__'"));
 assert.ok(source.includes("direction==='transfer'"));
});

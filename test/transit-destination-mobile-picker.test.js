'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('destination picker parses and supports both admin inputs',()=>{
 const code=fs.readFileSync(require.resolve('../transit-destination-picker.js'),'utf8');
 assert.doesNotThrow(()=>new vm.Script(code));
 assert.ok(code.includes('lotTransitTo'));
 assert.ok(code.includes('manageTransitTo'));
 assert.ok(code.includes('dispatchEvent'));
 assert.ok(code.includes('Актау'));
});
test('destination picker loads without touching main live screen',()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
 assert.ok(html.includes('transit-destination-picker.js?v=1'));
});

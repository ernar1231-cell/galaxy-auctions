'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('transit filter code parses and hides unmatched rows with CSS priority',()=>{
 const source=fs.readFileSync(require.resolve('../direction-lots-picker.js'),'utf8');
 assert.doesNotThrow(()=>new vm.Script(source));
 assert.ok(source.includes("row.style.setProperty('display',visible?'':'none',visible?'':'important')"));
 assert.ok(source.includes("norm(car?.destination||'Другие')===key"));
});

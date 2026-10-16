'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
for(const file of ['app.js','direction-lots-picker.js','api/direction-queue.js','api/admin-update-lot.js']){
 test(file+' parses without syntax errors',()=>{
  const source=fs.readFileSync(path.join(__dirname,'..',file),'utf8');
  assert.doesNotThrow(()=>new vm.Script(source,{filename:file}));
 });
}
test('destination marker regex parses correctly',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../api/direction-queue.js'),'utf8');
 assert.ok(source.includes('function destinationOf'));
 assert.ok(source.includes('destination:'));
});

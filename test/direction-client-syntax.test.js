'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
test('direction catalog and refresh scripts parse as JavaScript',()=>{
 for(const name of ['direction-catalog.js','direction-state-refresh.js']){
  const source=fs.readFileSync(path.join(__dirname,'..',name),'utf8');
  assert.doesNotThrow(()=>new vm.Script(source,{filename:name}));
 }
});

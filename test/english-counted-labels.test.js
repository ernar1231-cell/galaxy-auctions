'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('counted labels are supported without emoji',()=>{
 const src=fs.readFileSync(require.resolve('../language-preview.js'),'utf8');
 assert.doesNotThrow(()=>new vm.Script(src));
 for(const key of ['Favorites $2','Awaiting Confirmation $2','Upcoming $1','Sold $1','Available $1'])assert.ok(src.includes(key));
});

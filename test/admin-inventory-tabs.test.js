'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('four mutually exclusive admin tabs',()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
 const s=html.match(/<div class="adminStatusFilter adminSimpleTabs">([\s\S]*?)<\/div>/)[1];
 for(const x of ['inventory','auction','pending','sold'])assert.ok(s.includes('data-status="'+x+'"'));
 assert.ok(!s.includes('data-status="all"'));
});
test('inventory defaults and filters only matching group',()=>{
 const s=fs.readFileSync(require.resolve('../app.js'),'utf8');
 assert.doesNotThrow(()=>new vm.Script(s));
 assert.ok(s.includes('return group(l)===filter'));
 assert.ok(s.includes('adminLotFilter").value="inventory"'));
});

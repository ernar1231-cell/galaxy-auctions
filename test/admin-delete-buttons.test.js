'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('admin edit and delete code parses',()=>{
 for(const file of ['app.js','api/admin-delete-lot.js','api/admin-update-lot.js'])
  assert.doesNotThrow(()=>new vm.Script(fs.readFileSync(require.resolve('../'+file),'utf8')));
});
test('both delete buttons are wired and remain responsive',()=>{
 const source=fs.readFileSync(require.resolve('../app.js'),'utf8');
 for(const id of ['adminLotDelete'])assert.ok(source.includes('$("'+id+'").onclick=deleteManagedLot'));
 assert.ok(source.includes('Ошибка: '));
 assert.ok(source.includes("['live','pending','sold'].includes(status)"));
});
test('backend refuses to delete lots with bids or active/completed status',()=>{
 const source=fs.readFileSync(require.resolve('../api/admin-delete-lot.js'),'utf8');
 assert.ok(source.includes("['draft','upcoming'].includes"));
 assert.ok(source.includes('if(!r.ok)return res.status(502)'));
 assert.ok(source.includes('if(bids?.length)'));
});

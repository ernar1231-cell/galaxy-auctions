'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('admin card opens by database ID, not filtered array index',()=>{
 const s=fs.readFileSync(require.resolve('../app.js'),'utf8');
 assert.doesNotThrow(()=>new vm.Script(s));
 assert.ok(s.includes('data-admin-lot-id='));
 assert.ok(s.includes('adminLots.find(item=>String(item.id)===el.dataset.adminLotId)'));
 assert.ok(!s.includes('adminLots[Number(el.dataset.adminLot)]'));
});
test('archived lots excluded from normal admin inventory',()=>{
 const s=fs.readFileSync(require.resolve('../app.js'),'utf8');
 assert.ok(s.includes("if(String(l.status||'').toLowerCase()==='archived')return false"));
 assert.ok(s.includes('adminLotPicPlaceholder'));
});

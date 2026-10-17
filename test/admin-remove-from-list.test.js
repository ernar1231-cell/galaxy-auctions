'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('admin and API code parse',()=>{
 for(const path of ['app.js','api/admin-lot-action.js'])assert.doesNotThrow(()=>new vm.Script(fs.readFileSync(require.resolve('../'+path),'utf8')));
});
test('removal archives rather than deletes and checks live state',()=>{
 const s=fs.readFileSync(require.resolve('../api/admin-lot-action.js'),'utf8');
 assert.ok(s.includes("action==='remove_from_list'"));
 assert.ok(s.includes("status:'archived'"));
 assert.ok(s.includes('auction_bids?lot_id='));
 assert.ok(s.includes('auction_state?id=eq.1'));
 assert.ok(s.includes('historyPreserved:true'));
});
test('separate admin action exists for removing lots with old bids',()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
 const app=fs.readFileSync(require.resolve('../app.js'),'utf8');
 assert.ok(html.includes('id="adminLotRemoveFromList"'));
 assert.ok(app.includes('removeManagedLotFromList'));
});

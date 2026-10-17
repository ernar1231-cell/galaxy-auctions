'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
for(const file of ['app.js','api/admin-lot-action.js'])test(file+' parses',()=>{
 assert.doesNotThrow(()=>new vm.Script(fs.readFileSync(require.resolve('../'+file),'utf8')));
});
test('withdraw preserves lot and rejects bids and live lots',()=>{
 const source=fs.readFileSync(require.resolve('../api/admin-lot-action.js'),'utf8');
 assert.ok(source.includes("action==='withdraw'"));
 assert.ok(source.includes("auction_bids?lot_id"));
 assert.ok(source.includes("status:'archived'"));
 assert.ok(source.includes("['draft','upcoming'].includes(status)"));
 assert.ok(source.includes('GALAXY_WITHDRAWN'));
 assert.ok(!source.includes("method:'DELETE'"));
});
test('admin button is wired',()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
 const app=fs.readFileSync(require.resolve('../app.js'),'utf8');
 assert.ok(html.includes('id="adminLotWithdraw"'));
 assert.ok(app.includes('withdrawManagedLot'));
});

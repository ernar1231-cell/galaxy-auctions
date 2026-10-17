'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('delete and editor scripts parse',()=>{
 for(const f of ['app.js','api/admin-update-lot.js'])assert.doesNotThrow(()=>new vm.Script(fs.readFileSync(require.resolve('../'+f),'utf8')));
});
test('delete falls back to archived history for bids',()=>{
 const s=fs.readFileSync(require.resolve('../app.js'),'utf8');
 assert.ok(s.includes("action:'remove_from_list'"));
 assert.ok(s.includes("adminApi('/api/admin-delete-lot'"));
 assert.ok(s.includes("['draft','upcoming'].includes(status)"));
});
test('editing hides but preserves system tags',()=>{
 const app=fs.readFileSync(require.resolve('../app.js'),'utf8');
 const api=fs.readFileSync(require.resolve('../api/admin-update-lot.js'),'utf8');
 assert.ok(app.includes('GALAXY_[A-Z_]+'));
 assert.ok(api.includes('const preserved=raw.split'));
});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('admin route form and app parse',()=>{
 const app=fs.readFileSync(require.resolve('../app.js'),'utf8');
 assert.doesNotThrow(()=>new vm.Script(app));
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
 for(const id of ['lotTransitFrom','lotTransitDeparturePort','lotTransitDays','lotTransitTo'])assert.ok(html.includes('id="'+id+'"'));
});
test('server persists origin port and delivery estimate in metadata',()=>{
 const api=fs.readFileSync(require.resolve('../api/admin-create-lot.js'),'utf8');
 assert.doesNotThrow(()=>new vm.Script(api));
 assert.ok(api.includes('departurePort:'));
 assert.ok(api.includes('transitDays:'));
});

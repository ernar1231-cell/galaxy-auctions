'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('two admin removal actions are present',()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
 assert.ok(html.includes('id="adminLotDelete"'));
 assert.ok(html.includes('id="adminLotRemoveFromList"'));
 for(const id of ['adminLotQuickDelete','adminLotWithdraw','adminLotArchive'])assert.ok(!html.includes('id="'+id+'"'));
});
test('both controls are wired and script parses',()=>{
 const source=fs.readFileSync(require.resolve('../app.js'),'utf8');
 assert.doesNotThrow(()=>new vm.Script(source));
 assert.ok(source.includes('$("adminLotDelete").onclick=deleteManagedLot'));
 assert.ok(source.includes('$("adminLotRemoveFromList").onclick=removeManagedLotFromList'));
});

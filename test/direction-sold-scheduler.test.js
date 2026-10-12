'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
test('scheduler routes SOLD through atomic next-lot RPC',()=>{
 const code=fs.readFileSync(path.join(__dirname,'../api/direction-phase-tick.js'),'utf8');
 assert.match(code,/transition\.from==='sold'/);
 assert.match(code,/rpc\/galaxy_advance_direction_lot/);
 assert.match(code,/rpc\/galaxy_advance_direction_phase/);
});

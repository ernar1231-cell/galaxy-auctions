'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../api/direction-phase-tick.js'),'utf8');
test('authenticated scheduler dry-run reads sessions without executing RPC',async()=>{
 const urls=[];
 const sandbox={
  require:id=>id==='./_direction-phase-transition'?{nextPhase:()=>null}:(()=>{throw Error(id)})(),
  module:{exports:{}},
  process:{env:{GALAXY_LEGACY_DIRECTION_SESSIONS:'true',GALAXY_SCHEDULER_SECRET:'s'.repeat(40),SUPABASE_URL:'https://database.invalid',SUPABASE_SERVICE_ROLE_KEY:'service-test'}},
  fetch:async url=>{urls.push(url);return {ok:true,json:async()=>[{direction:'dubai',enabled:false,phase:'waiting'},{direction:'transfer',enabled:false,phase:'waiting'}]};}
 };
 vm.runInNewContext(source,sandbox);
 let status,body;
 const res={setHeader(){},status(code){status=code;return this},json(payload){body=JSON.parse(JSON.stringify(payload));return this}};
 await sandbox.module.exports({method:'POST',headers:{authorization:'Bearer '+'s'.repeat(40)},body:{dryRun:true}},res);
 assert.equal(status,200);assert.equal(body.dryRun,true);assert.equal(body.checked,2);
 assert.deepEqual(body.sessions.map(s=>s.direction),['dubai','transfer']);
 assert.equal(urls.length,1);
 assert.equal(urls[0].includes('/rpc/'),false);
});

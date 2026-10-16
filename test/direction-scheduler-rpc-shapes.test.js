'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../api/direction-phase-tick.js'),'utf8');
async function run(payload){
 const calls=[];
 const fetch=async(url,opts={})=>{
  calls.push({url,body:opts.body});
  if(url.includes('galaxy_auction_sessions?'))return {ok:true,json:async()=>[{direction:'dubai',enabled:false,phase:'waiting'},{direction:'transfer',enabled:false,phase:'waiting'}]};
  return {ok:true,json:async()=>payload};
 };
 const sandbox={require:(id)=>id==='./_direction-phase-transition'?{nextPhase:()=>null}:(()=>{throw Error(id)})(),module:{exports:{}},process:{env:{GALAXY_LEGACY_DIRECTION_SESSIONS:'true',GALAXY_SCHEDULER_SECRET:'x'.repeat(40),SUPABASE_SERVICE_ROLE_KEY:'test',SUPABASE_URL:'https://db.invalid'}},fetch};
 vm.runInNewContext(source,sandbox);
 let status,body;
 const res={setHeader(){},status(code){status=code;return this},json(data){body=JSON.parse(JSON.stringify(data));return this}};
 await sandbox.module.exports({method:'POST',headers:{authorization:'Bearer '+'x'.repeat(40)}},res);
 return {status,body,calls};
}
test('object RPC responses do not prevent the second direction from starting',async()=>{
 const r=await run({changed:false,phase:'waiting'});
 assert.equal(r.status,200);
 assert.equal(r.body.checked,2);
 assert.equal(r.body.transitions.length,2);
 assert.deepEqual(r.body.transitions.map(x=>x.direction),['dubai','transfer']);
});
test('array RPC responses remain supported',async()=>{
 const r=await run([{changed:false,phase:'waiting'}]);
 assert.equal(r.status,200);
 assert.equal(r.body.transitions.length,2);
});

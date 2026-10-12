'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../api/direction-phase-tick.js'),'utf8');
async function invoke({method='POST',authorization,secret,dbKey,dbUrl,fetchImpl,nextPhase=()=>null}={}){
 let calls=0;
 const sandbox={
  require(name){if(name==='./_direction-phase-transition')return {nextPhase};throw Error('Unexpected require '+name);},
  module:{exports:{}},
  process:{env:{GALAXY_SCHEDULER_SECRET:secret,SUPABASE_SERVICE_ROLE_KEY:dbKey,SUPABASE_URL:dbUrl}},
  fetch:async(...args)=>{calls++;if(!fetchImpl)throw Error('Unexpected network access');return fetchImpl(...args);}
 };
 vm.runInNewContext(source,sandbox);
 let status,body;
 const res={setHeader(){},status(value){status=value;return this;},json(value){body=JSON.parse(JSON.stringify(value));return this;}};
 await sandbox.module.exports({method,headers:{authorization}},res);
 return {status,body,calls};
}
test('scheduler rejects non-POST without network access',async()=>{
 const r=await invoke({method:'GET'});
 assert.equal(r.status,405);assert.equal(r.calls,0);
});
test('scheduler fails closed without configured secret',async()=>{
 const r=await invoke({authorization:'Bearer x'});
 assert.equal(r.status,503);assert.equal(r.calls,0);
});
test('scheduler rejects unauthorized calls without database access',async()=>{
 const r=await invoke({secret:'s'.repeat(32),authorization:'Bearer wrong'});
 assert.equal(r.status,401);assert.equal(r.calls,0);
});
test('scheduler requires database credentials before network access',async()=>{
 const secret='s'.repeat(32);
 const r=await invoke({secret,authorization:'Bearer '+secret});
 assert.equal(r.status,503);assert.equal(r.calls,0);
});
test('scheduler never processes USA sessions or transitions',async()=>{
 const secret='s'.repeat(32);
 const requests=[];
 const r=await invoke({
  secret,authorization:'Bearer '+secret,dbKey:'test',dbUrl:'https://database.invalid',
  fetchImpl:async(url,options)=>{requests.push({url,options});return {ok:true,json:async()=>[]};}
 });
 assert.equal(r.status,200);
 assert.equal(r.body.checked,0);
 assert.equal(requests.length,1);
 assert.match(requests[0].url,/direction=in\.\(dubai,transfer\)/);
 assert.doesNotMatch(requests[0].url,/usa/);
});

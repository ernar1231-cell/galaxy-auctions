'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../api/direction-set-proxy-max.js'),'utf8');
async function invoke(flag){
 let called=null,status,payload;
 const sandbox={
  module:{exports:{}},process:{env:{GALAXY_DIRECTION_PROXY_ENABLED:'true',GALAXY_DIRECTION_UNIFIED_BIDS_READY:flag?'true':'false',TELEGRAM_BOT_TOKEN:'test',SUPABASE_URL:'https://db.invalid/',SUPABASE_SERVICE_ROLE_KEY:'test'}},
  fetch:async(url,opts)=>{called={url,body:JSON.parse(opts.body)};return {ok:true,json:async()=>[{event_id:42,new_bid:10100}]};},
  require:id=>id==='./_direction-telegram-auth'?{verifyTelegram:()=> '123'}:id==='./_multi-auction-core'?{assertDirection:d=>d}:(()=>{throw Error(id)})()
 };
 vm.runInNewContext(source,sandbox);
 const res={setHeader(){},status(n){status=n;return this},json(x){payload=JSON.parse(JSON.stringify(x));return this}};
 await sandbox.module.exports({method:'POST',body:{direction:'dubai',lotNumber:69,maximum:15000,initData:'test'}},res);
 return {called,status,payload};
}
test('proxy remains fail-closed by default',async()=>{
 const r=await invoke(false);assert.equal(r.status,503);assert.equal(r.called,null);
});
test('proxy uses only unified atomic RPC when explicitly enabled',async()=>{
 const r=await invoke(true);
 assert.equal(r.status,200);
 assert.equal(r.called.url,'https://db.invalid/rest/v1/rpc/galaxy_direction_submit_bid');
 assert.equal(r.called.body.p_mode,'proxy');
 assert.equal(r.called.body.p_amount,15000);
 assert.equal(r.payload.bid.new_bid,10100);
});
test('manual bids can opt in to same atomic RPC without changing USA',()=>{
 const manual=fs.readFileSync(path.join(__dirname,'../api/direction-place-bid.js'),'utf8');
 assert.ok(manual.includes("GALAXY_DIRECTION_UNIFIED_BIDS_READY"));
 assert.ok(manual.includes("p_mode:'manual'"));
 assert.ok(manual.includes("if(direction==='usa')"));
});

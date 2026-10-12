'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const core=require('../api/_multi-auction-core');
const source=fs.readFileSync(path.join(__dirname,'../api/direction-place-bid.js'),'utf8');
async function run(direction,session,assignmentDirection='dubai',lotDirection='dubai'){
 const calls=[];
 const fetch=async(url,opts={})=>{
  const u=new URL(url);calls.push({url:u,method:opts.method||'GET'});
  let data=[];
  if(u.pathname.endsWith('/galaxy_auction_sessions'))data=[session];
  else if(u.pathname.endsWith('/galaxy_auction_lot_assignments'))data=[{lot_number:69,direction:assignmentDirection}];
  else if(u.pathname.endsWith('/auction_lots'))data=[{lot_number:69,status:'upcoming',description:'[GALAXY_DIRECTION:'+JSON.stringify({direction:lotDirection})+']'}];
  else throw Error('Unexpected table');
  return {ok:true,json:async()=>data};
 };
 const sandbox={require:(name)=>{if(name==='./_multi-auction-core')return core;if(name==='./_direction-telegram-auth')return {verifyTelegram:()=>null};throw Error('Unexpected module '+name);},module:{exports:{}},process:{env:{SUPABASE_URL:'https://database.invalid',SUPABASE_SERVICE_ROLE_KEY:'test',GALAXY_DIRECTION_BIDDING_ENABLED:'true'}},fetch,URL};
 vm.runInNewContext(source,sandbox);
 let status=0,body=null;
 const res={setHeader(){},status(n){status=n;return this;},json(data){body=JSON.parse(JSON.stringify(data));return this;}};
 await sandbox.module.exports({method:'POST',body:{direction,lotNumber:69}},res);
 return {status,body,calls};
}
test('USA direction cannot enter independent bid endpoint',async()=>{
 const r=await run('usa',{direction:'usa',enabled:true,phase:'red',current_lot_number:69});
 assert.equal(r.status,400);assert.equal(r.calls.length,0);
});
test('disabled Dubai session rejects bids without writing',async()=>{
 const r=await run('dubai',{direction:'dubai',enabled:false,phase:'red',current_lot_number:69});
 assert.equal(r.status,409);assert.ok(r.calls.every(c=>c.method==='GET'));
});
test('a lot assigned to a different auction cannot be bid on',async()=>{
 const r=await run('dubai',{direction:'dubai',enabled:true,phase:'red',current_lot_number:69},'transfer');
 assert.equal(r.status,409);assert.ok(r.calls.every(c=>c.method==='GET'));
});
test('even enabled Dubai sessions fail closed until atomic bid RPC is ready',async()=>{
 const r=await run('dubai',{direction:'dubai',enabled:true,phase:'red',current_lot_number:69});
 assert.equal(r.status,401);assert.equal(r.body.code,'TELEGRAM_AUTH_REQUIRED');assert.ok(r.calls.every(c=>c.method==='GET'));
});

test('bid endpoint remains closed when server activation flag is missing',async()=>{
 const src=fs.readFileSync(path.join(__dirname,'../api/direction-place-bid.js'),'utf8');
 const sandbox={require:(name)=>{if(name==='./_multi-auction-core')return core;if(name==='./_direction-telegram-auth')return {verifyTelegram:()=>null};throw Error('Unexpected module');},module:{exports:{}},process:{env:{}},fetch:async()=>{throw Error('Unexpected database access');}};
 vm.runInNewContext(src,sandbox);
 let status,body;const res={setHeader(){},status(n){status=n;return this},json(x){body=x;return this}};
 await sandbox.module.exports({method:'POST',body:{direction:'dubai',lotNumber:69}},res);
 assert.equal(status,503);assert.equal(body.code,'BIDDING_NOT_READY');
});

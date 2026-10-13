'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const crypto=require('node:crypto');
const handler=require('../api/direction-safe-readiness');
const old={...process.env};
function init(id){
 const p=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify({id})});
 const data=[...p.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+'='+v).join('\n');
 const key=crypto.createHmac('sha256','WebAppData').update('test_token').digest();
 p.set('hash',crypto.createHmac('sha256',key).update(data).digest('hex'));
 return p.toString();
}
function res(){return {statusCode:200,setHeader(){},status(n){this.statusCode=n;return this;},json(x){this.body=x;return this;}};}
test('readiness requires signed Telegram and excludes USA',async()=>{
 const a=res();await handler({method:'POST',body:{direction:'dubai',initData:'bad'}},a);assert.equal(a.statusCode,401);
 process.env.TELEGRAM_BOT_TOKEN='test_token';
 const b=res();await handler({method:'POST',body:{direction:'usa',initData:init(123)}},b);assert.equal(b.statusCode,400);
});
test('readiness only GETs user, session and queue, never writes or enables real bidding',async()=>{
 const fetchOld=global.fetch;let calls=[];
 Object.assign(process.env,{TELEGRAM_BOT_TOKEN:'test_token',SUPABASE_URL:'https://example.invalid',SUPABASE_SERVICE_ROLE_KEY:'test_key'});
 global.fetch=async(url,opts)=>{
  calls.push({url,opts});
  return {ok:true,json:async()=>url.includes('auction_users?')?[{account_status:'active',deposit_amount:1000,bid_limit:50000}]:url.includes('galaxy_auction_sessions?')?[{enabled:false,start_armed:false,phase:'waiting',local_start:'18:00:00',timezone:'Asia/Dubai'}]:[{lot_number:70}]};
 };
 try{
  const r=res();await handler({method:'POST',body:{direction:'transfer',initData:init(123)}},r);
  assert.equal(r.statusCode,200);assert.equal(r.body.participant.active,true);
  assert.equal(r.body.queuedLots,1);assert.equal(r.body.readyForTenLots,false);
  assert.equal(r.body.realBiddingEnabled,false);assert.equal(r.body.session.startArmed,false);
  assert.equal(calls.length,3);assert(calls.every(x=>!x.opts.method||x.opts.method==='GET'));
 }finally{global.fetch=fetchOld;for(const k of Object.keys(process.env))if(!(k in old))delete process.env[k];Object.assign(process.env,old);}
});

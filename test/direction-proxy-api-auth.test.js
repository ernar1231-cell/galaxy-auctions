'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const handler=require('../api/direction-set-proxy-max');
const saved={...process.env};
function request(body){return {method:'POST',body};}
function response(){return {statusCode:200,body:null,headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(v){this.body=v;return this;}};}
function initData(id){
 const p=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify({id})});
 const data=[...p.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+'='+v).join('\n');
 const secret=crypto.createHmac('sha256','WebAppData').update('test_bot_token').digest();
 p.set('hash',crypto.createHmac('sha256',secret).update(data).digest('hex'));
 return p.toString();
}
test('proxy API rejects USA and unauthenticated requests, uses only atomic RPC',async()=>{
 const originalFetch=global.fetch;let calls=[];
 Object.assign(process.env,{GALAXY_DIRECTION_PROXY_ENABLED:'true',GALAXY_DIRECTION_UNIFIED_BIDS_READY:'true',TELEGRAM_BOT_TOKEN:'test_bot_token',SUPABASE_URL:'https://example.invalid',SUPABASE_SERVICE_ROLE_KEY:'fixture_key'});
 global.fetch=async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>[{event_id:5,new_bid:10100}]};};
 try{
  let res=response();await handler(request({direction:'usa',lotNumber:69,maximum:15000,initData:initData(101)}),res);
  assert.equal(res.statusCode,400);assert.equal(calls.length,0);
  res=response();await handler(request({direction:'dubai',lotNumber:69,maximum:15000,initData:'fake'}),res);
  assert.equal(res.statusCode,401);assert.equal(calls.length,0);
  res=response();await handler(request({direction:'dubai',lotNumber:69,maximum:15000,initData:initData(101)}),res);
  assert.equal(res.statusCode,200);
  assert.equal(calls.length,1);
  assert.match(calls[0].url,/\/rpc\/galaxy_direction_submit_bid$/);
  assert.deepEqual(JSON.parse(calls[0].options.body),{p_direction:'dubai',p_lot_number:69,p_user_telegram_id:'101',p_mode:'proxy',p_amount:15000});
  res=response();await handler(request({direction:'transfer',lotNumber:70,maximum:30000,initData:initData(102)}),res);
  assert.equal(res.statusCode,200);
  assert.equal(JSON.parse(calls[1].options.body).p_direction,'transfer');
 }finally{global.fetch=originalFetch;for(const key of Object.keys(process.env))if(!(key in saved))delete process.env[key];Object.assign(process.env,saved);}
});
test('proxy API stays closed when readiness flag is disabled',async()=>{
 const old=process.env.GALAXY_DIRECTION_PROXY_ENABLED;process.env.GALAXY_DIRECTION_PROXY_ENABLED='false';
 try{const res=response();await handler(request({direction:'dubai',lotNumber:69,maximum:15000}),res);assert.equal(res.statusCode,503);assert.equal(res.body.code,'PROXY_NOT_READY');}
 finally{if(old===undefined)delete process.env.GALAXY_DIRECTION_PROXY_ENABLED;else process.env.GALAXY_DIRECTION_PROXY_ENABLED=old;}
});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../api/direction-set-proxy-max.js'),'utf8');
async function run(body,enabled){
 const sandbox={module:{exports:{}},process:{env:{GALAXY_DIRECTION_PROXY_ENABLED:enabled?'true':'false',TELEGRAM_BOT_TOKEN:'test'}},require:name=>{
  if(name==='./_direction-telegram-auth')return {verifyTelegram:()=> '123'};
  if(name==='./_multi-auction-core')return {assertDirection:v=>{if(!['usa','dubai','transfer'].includes(v))throw Error('invalid');return v;}};
  throw Error(name);
 }};
 vm.runInNewContext(source,sandbox);
 let status,payload;const res={setHeader(){},status(n){status=n;return this},json(v){payload=JSON.parse(JSON.stringify(v));return this}};
 await sandbox.module.exports({method:'POST',body},res);return {status,payload};
}
test('proxy endpoint is disabled by default',async()=>{const r=await run({direction:'dubai',lotNumber:69,maximum:15000},false);assert.equal(r.status,503);assert.equal(r.payload.code,'PROXY_NOT_READY');});
test('USA cannot use direction proxy endpoint',async()=>{const r=await run({direction:'usa',lotNumber:69,maximum:15000},true);assert.equal(r.status,400);});
test('proxy endpoint fails closed even if flag enabled until atomic pricing is integrated',async()=>{const r=await run({direction:'transfer',lotNumber:70,maximum:15000},true);assert.equal(r.status,503);assert.equal(r.payload.code,'PROXY_EXECUTION_NOT_READY');});

test('proxy endpoint contains no database writes until atomic competition exists',()=>{
 assert.equal(source.includes('/rest/v1/rpc/galaxy_set_direction_proxy_max'),false);
 assert.ok(source.includes('PROXY_EXECUTION_NOT_READY'));
});

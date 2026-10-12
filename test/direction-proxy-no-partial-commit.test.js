'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../api/direction-set-proxy-max.js'),'utf8');
test('proxy maximum endpoint cannot write even when every activation flag is true',async()=>{
 let writes=0;
 const sandbox={
  module:{exports:{}},
  process:{env:{GALAXY_DIRECTION_PROXY_ENABLED:'true',GALAXY_DIRECTION_PROXY_ATOMIC_READY:'true',TELEGRAM_BOT_TOKEN:'test'}},
  fetch:async()=>{writes++;throw Error('Unexpected network call');},
  require:id=>{
   if(id==='./_direction-telegram-auth')return {verifyTelegram:()=> '123'};
   if(id==='./_multi-auction-core')return {assertDirection:d=>{if(!['usa','dubai','transfer'].includes(d))throw Error('invalid');return d;}};
   throw Error(id);
  }
 };
 vm.runInNewContext(source,sandbox);
 let status,body;
 const res={setHeader(){},status(n){status=n;return this},json(x){body=JSON.parse(JSON.stringify(x));return this}};
 await sandbox.module.exports({method:'POST',body:{direction:'dubai',lotNumber:69,maximum:15000,initData:'test'}},res);
 assert.equal(status,503);
 assert.equal(body.code,'PROXY_EXECUTION_NOT_READY');
 assert.equal(writes,0);
});

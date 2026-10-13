'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {verifyTelegram}=require('../api/_direction-telegram-auth');
const simState=require('../api/simulation-state');
function response(){return {statusCode:200,setHeader(){},status(n){this.statusCode=n;return this;},json(v){this.body=v;return this;}};}
test('production auctions cannot be armed by simulation state endpoint',async()=>{
 for(const method of ['POST','PUT','DELETE']){
  const r=response();await simState({method,query:{direction:'dubai'}},r);
  assert.equal(r.statusCode,405);
 }
});
test('simulation state stays fail closed when disabled',async()=>{
 const old=process.env.GALAXY_SIMULATION_ENABLED;delete process.env.GALAXY_SIMULATION_ENABLED;
 try{const r=response();await simState({method:'GET',query:{direction:'transfer'}},r);assert.equal(r.statusCode,503);}
 finally{if(old===undefined)delete process.env.GALAXY_SIMULATION_ENABLED;else process.env.GALAXY_SIMULATION_ENABLED=old;}
});
test('Telegram authentication rejects fabricated or missing identity',()=>{
 assert.equal(verifyTelegram('user=%7B%22id%22%3A123%7D','test_token'),null);
 assert.equal(verifyTelegram('','test_token'),null);
});

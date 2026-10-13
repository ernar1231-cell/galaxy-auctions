'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const handler=require('../api/direction-phase-tick');
const config=JSON.parse(fs.readFileSync(path.join(__dirname,'../vercel.json'),'utf8'));
function res(){return {statusCode:200,body:null,setHeader(){},status(n){this.statusCode=n;return this;},json(data){this.body=data;return this;}};}
test('cron schedule is installed and isolated to direction phase tick',()=>{
 assert.deepEqual(config.crons,[{path:'/api/direction-phase-tick',schedule:'* * * * *'}]);
});
test('missing scheduler secret fails closed without reading database',async()=>{
 const prior=process.env.GALAXY_SCHEDULER_SECRET;delete process.env.GALAXY_SCHEDULER_SECRET;
 const r=res();await handler({method:'GET',headers:{}},r);
 assert.equal(r.statusCode,503);
 if(prior!==undefined)process.env.GALAXY_SCHEDULER_SECRET=prior;
});
test('unauthorized cron is rejected',async()=>{
 const prior=process.env.GALAXY_SCHEDULER_SECRET;process.env.GALAXY_SCHEDULER_SECRET='x'.repeat(40);
 const r=res();await handler({method:'GET',headers:{authorization:'Bearer invalid'}},r);
 assert.equal(r.statusCode,401);
 if(prior===undefined)delete process.env.GALAXY_SCHEDULER_SECRET;else process.env.GALAXY_SCHEDULER_SECRET=prior;
});
test('authenticated dry-run reads only disabled sessions, never calls mutating RPC',async()=>{
 const saved={secret:process.env.GALAXY_SCHEDULER_SECRET,key:process.env.SUPABASE_SERVICE_ROLE_KEY,url:process.env.SUPABASE_URL};
 process.env.GALAXY_SCHEDULER_SECRET='y'.repeat(40);process.env.SUPABASE_SERVICE_ROLE_KEY='fixture';process.env.SUPABASE_URL='https://example.invalid';
 const original=global.fetch;const calls=[];
 global.fetch=async(url)=>{calls.push(url);return {ok:true,json:async()=>[{direction:'dubai',enabled:false,phase:'waiting',current_lot_number:69},{direction:'transfer',enabled:false,phase:'waiting',current_lot_number:70}]};};
 try{
  const r=res();await handler({method:'GET',headers:{authorization:'Bearer '+'y'.repeat(40)},query:{dryRun:'true'}},r);
  assert.equal(r.statusCode,200);assert.equal(r.body.dryRun,true);assert.equal(r.body.checked,2);assert.equal(calls.length,1);
  const normal=res();await handler({method:'GET',headers:{authorization:'Bearer '+'y'.repeat(40)}},normal);
  assert.equal(normal.statusCode,200);
  assert(calls.some(x=>x.includes('galaxy_start_armed_direction')));
  assert(!calls.some(x=>x.includes('galaxy_advance_direction_lot')||x.includes('galaxy_advance_direction_phase')));
 }finally{
  global.fetch=original;
  for(const [k,v] of [['GALAXY_SCHEDULER_SECRET',saved.secret],['SUPABASE_SERVICE_ROLE_KEY',saved.key],['SUPABASE_URL',saved.url]])if(v===undefined)delete process.env[k];else process.env[k]=v;
 }
});

'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const handler=require('../api/direction-phase-tick');
const originalFetch=global.fetch;
const originalEnv=process.env.GALAXY_SINGLE_LINE_CYCLE_ENABLED;
const originalSecret=process.env.GALAXY_SCHEDULER_SECRET;
const originalUrl=process.env.SUPABASE_URL;
const originalKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
function response(data,ok=true){return {ok,json:async()=>data};}
async function run(cycle,sessions){
 const calls=[];
 global.fetch=async(url,options={})=>{
  calls.push({url,method:options.method||'GET'});
  if(url.includes('galaxy_auction_sessions?'))return response(sessions);
  if(url.includes('galaxy_single_line_cycle?'))return response([cycle]);
  if(url.includes('/rpc/galaxy_cycle_start_next'))return response([{started:true,direction:'dubai',lot_number:42}]);
  if(url.includes('/rpc/galaxy_cycle_finish_direction'))return response([{phase:'break',next_direction:'transfer'}]);
  throw Error('Unexpected endpoint '+url);
 };
 const res={code:200,setHeader(){},status(n){this.code=n;return this;},json(x){this.data=x;return this;}};
 await handler({method:'POST',headers:{authorization:'Bearer '+process.env.GALAXY_SCHEDULER_SECRET},body:{}},res);
 return {res,calls};
}
test('single-line scheduler never starts direction before one-hour break expires',async()=>{
 process.env.GALAXY_SINGLE_LINE_CYCLE_ENABLED='true';
 process.env.GALAXY_SCHEDULER_SECRET='x'.repeat(40);
 process.env.SUPABASE_URL='https://example.supabase.co';
 process.env.SUPABASE_SERVICE_ROLE_KEY='fake-test-key';
 try{
  const sessions=[{direction:'dubai',enabled:false,phase:'waiting'},{direction:'transfer',enabled:false,phase:'waiting'}];
  const future=new Date(Date.now()+3600000).toISOString();
  const early=await run({phase:'break',next_direction:'dubai',break_ends_at:future},sessions);
  assert.equal(early.res.code,200);
  assert.equal(early.calls.filter(c=>c.method==='POST').length,0);
  const due=await run({phase:'break',next_direction:'dubai',break_ends_at:new Date(Date.now()-1000).toISOString()},sessions);
  assert.equal(due.res.code,200);
  assert.deepEqual(due.calls.filter(c=>c.method==='POST').map(c=>c.url.split('/').pop()),['galaxy_cycle_start_next']);
  const stopped=await run({phase:'stopped'},sessions);
  assert.equal(stopped.calls.filter(c=>c.method==='POST').length,0);
 }finally{
  global.fetch=originalFetch;
  for(const [k,v] of Object.entries({GALAXY_SINGLE_LINE_CYCLE_ENABLED:originalEnv,GALAXY_SCHEDULER_SECRET:originalSecret,SUPABASE_URL:originalUrl,SUPABASE_SERVICE_ROLE_KEY:originalKey}))if(v===undefined)delete process.env[k];else process.env[k]=v;
 }
});

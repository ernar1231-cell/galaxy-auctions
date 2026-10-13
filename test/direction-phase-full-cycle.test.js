'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const handler=require('../api/direction-phase-tick');
const {nextPhase}=require('../api/_direction-phase-transition');
const secret='s'.repeat(40);
function response(){return {statusCode:200,body:null,setHeader(){},status(v){this.statusCode=v;return this;},json(v){this.body=v;return this;}};}
function mockSession(direction,phase,lot){return {direction,enabled:true,phase,current_lot_number:lot,phase_started_at:new Date(Date.now()-120000).toISOString()};}
test('scheduler independently advances Dubai and Transit through RED GREEN BONUS SOLD and next lot',async()=>{
 const original=global.fetch,old={secret:process.env.GALAXY_SCHEDULER_SECRET,key:process.env.SUPABASE_SERVICE_ROLE_KEY,url:process.env.SUPABASE_URL};
 process.env.GALAXY_SCHEDULER_SECRET=secret;process.env.SUPABASE_SERVICE_ROLE_KEY='test';process.env.SUPABASE_URL='https://db.invalid';
 const sessions=[mockSession('dubai','red',69),mockSession('transfer','red',70)];
 const rpcCalls=[];
 global.fetch=async(url,options={})=>{
  if(url.includes('galaxy_auction_sessions?'))return {ok:true,json:async()=>sessions.map(x=>({...x}))};
  const body=JSON.parse(options.body||'{}');rpcCalls.push({url,body});
  const s=sessions.find(x=>x.direction===body.p_direction);
  assert(s,'only Dubai/Transit');
  if(url.includes('galaxy_advance_direction_phase')){
   assert.equal(body.p_expected_lot,s.current_lot_number);
   assert.equal(body.p_expected_phase,s.phase);
   s.phase=nextPhase(s).to;s.phase_started_at=new Date(Date.now()-120000).toISOString();
  }else if(url.includes('galaxy_advance_direction_lot')){
   assert.equal(s.phase,'sold');
   s.current_lot_number+=2;s.phase='red';s.phase_started_at=new Date().toISOString();
  }else throw Error('Unexpected RPC');
  return {ok:true,json:async()=>[{changed:true}]};
 };
 try{
  for(let i=0;i<4;i++){
   const r=response();await handler({method:'GET',headers:{authorization:'Bearer '+secret}},r);
   assert.equal(r.statusCode,200);
   assert.equal(r.body.checked,2);
  }
  assert.deepEqual(sessions.map(x=>[x.direction,x.current_lot_number,x.phase]),[['dubai',71,'red'],['transfer',72,'red']]);
  assert.equal(rpcCalls.filter(x=>x.url.includes('galaxy_advance_direction_phase')).length,4);
  assert.equal(rpcCalls.filter(x=>x.url.includes('galaxy_advance_direction_lot')).length,2);
  assert(rpcCalls.every(x=>['dubai','transfer'].includes(x.body.p_direction)));
 }finally{
  global.fetch=original;
  for(const [k,v] of [['GALAXY_SCHEDULER_SECRET',old.secret],['SUPABASE_SERVICE_ROLE_KEY',old.key],['SUPABASE_URL',old.url]])if(v===undefined)delete process.env[k];else process.env[k]=v;
 }
});
test('disabled unarmed auctions cannot be started by scheduler',async()=>{
 const original=global.fetch,old={secret:process.env.GALAXY_SCHEDULER_SECRET,key:process.env.SUPABASE_SERVICE_ROLE_KEY,url:process.env.SUPABASE_URL};
 process.env.GALAXY_SCHEDULER_SECRET=secret;process.env.SUPABASE_SERVICE_ROLE_KEY='test';process.env.SUPABASE_URL='https://db.invalid';
 let attempted=0;
 global.fetch=async(url)=>{
  if(url.includes('galaxy_auction_sessions?'))return {ok:true,json:async()=>[{direction:'dubai',enabled:false,phase:'waiting',current_lot_number:69}]};
  if(url.includes('galaxy_start_armed_direction')){attempted++;return {ok:true,json:async()=>[{changed:false}]};}
  throw Error('Disabled session must not advance');
 };
 try{
  const r=response();await handler({method:'GET',headers:{authorization:'Bearer '+secret}},r);
  assert.equal(r.statusCode,200);assert.equal(attempted,1);
  assert.deepEqual(r.body.transitions,[{direction:'dubai',changed:false}]);
 }finally{
  global.fetch=original;
  for(const [k,v] of [['GALAXY_SCHEDULER_SECRET',old.secret],['SUPABASE_SERVICE_ROLE_KEY',old.key],['SUPABASE_URL',old.url]])if(v===undefined)delete process.env[k];else process.env[k]=v;
 }
});

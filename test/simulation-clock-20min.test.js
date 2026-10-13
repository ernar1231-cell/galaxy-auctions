'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {projectSimulation,CYCLE_MS}=require('../api/_simulation-clock');
const api=require('../api/simulation-state');
const at=(minute,second=0)=>Date.UTC(2026,9,13,12,minute,second);
test('every twenty minutes resets to first of five lots',()=>{
 for(const minute of [0,20,40]){
  const s=projectSimulation(at(minute));assert.equal(s.position,1);assert.equal(s.phase,'red');
  assert.equal(s.secondsRemaining,150);
 }
 assert.equal(projectSimulation(at(19,59)).position,5);
 assert.equal(projectSimulation(at(19,59)).phase,'sold');
 assert.equal(projectSimulation(at(20)).position,1);
 assert.equal(CYCLE_MS,1200000);
});
test('all five lots get four-minute windows with phases',()=>{
 for(let i=0;i<5;i++){
  const base=i*4;
  assert.deepEqual([projectSimulation(at(base)).phase,projectSimulation(at(base+2,30)).phase,projectSimulation(at(base+3,30)).phase,projectSimulation(at(base+3,55)).phase],['red','green','bonus','sold']);
  assert.equal(projectSimulation(at(base)).position,i+1);
 }
});
test('clock works across midnight without changing real auction',()=>{
 assert.equal(projectSimulation(Date.UTC(2026,9,13,23,59,59)).position,5);
 assert.equal(projectSimulation(Date.UTC(2026,9,14,0,0,0)).position,1);
});
test('simulation endpoint stays disabled without opt-in',async()=>{
 const prior=process.env.GALAXY_SIMULATION_ENABLED;delete process.env.GALAXY_SIMULATION_ENABLED;
 const res={statusCode:200,setHeader(){},status(n){this.statusCode=n;return this;},json(x){this.body=x;return this;}};
 await api({method:'GET',query:{direction:'usa'}},res);
 assert.equal(res.statusCode,503);assert.equal(res.body.code,'SIMULATION_NOT_READY');
 if(prior!==undefined)process.env.GALAXY_SIMULATION_ENABLED=prior;
});

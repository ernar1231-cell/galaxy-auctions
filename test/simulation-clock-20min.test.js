'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {projectSimulation,CYCLE_MS,LOT_MS}=require('../api/_simulation-clock');
const api=require('../api/simulation-state');
const at=(minute,second=0)=>Date.UTC(2026,9,13,12,minute,second);
test('new 10-minute cycle starts at every ten-minute boundary',()=>{
 for(const minute of [0,10,20,30,40,50]){const s=projectSimulation(at(minute));assert.equal(s.position,1);assert.equal(s.phase,'red');}
 assert.equal(projectSimulation(at(9,59)).position,5);
 assert.equal(projectSimulation(at(9,59)).phase,'sold');
 assert.equal(projectSimulation(at(10)).position,1);
 assert.equal(CYCLE_MS,600000);assert.equal(LOT_MS,120000);
});
test('five two-minute lots have RED GREEN BONUS SOLD phases',()=>{
 for(let i=0;i<5;i++){
  const m=i*2;
  assert.equal(projectSimulation(at(m)).phase,'red');
  assert.equal(projectSimulation(at(m+1)).phase,'green');
  assert.equal(projectSimulation(at(m+1,30)).phase,'bonus');
  assert.equal(projectSimulation(at(m+1,50)).phase,'sold');
  assert.equal(projectSimulation(at(m)).position,i+1);
 }
});
test('clock repeats across midnight',()=>{
 assert.equal(projectSimulation(Date.UTC(2026,9,13,23,59,59)).position,5);
 assert.equal(projectSimulation(Date.UTC(2026,9,14,0,0)).position,1);
});
test('simulation API fails closed if not enabled',async()=>{
 const old=process.env.GALAXY_SIMULATION_ENABLED;delete process.env.GALAXY_SIMULATION_ENABLED;
 const r={statusCode:200,setHeader(){},status(n){this.statusCode=n;return this;},json(v){this.body=v;return this;}};
 await api({method:'GET',query:{direction:'usa'}},r);
 assert.equal(r.statusCode,503);
 if(old!==undefined)process.env.GALAXY_SIMULATION_ENABLED=old;
});

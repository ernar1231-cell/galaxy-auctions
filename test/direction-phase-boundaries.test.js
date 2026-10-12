'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {nextPhase}=require('../api/_direction-phase-transition');
const {phaseClock,DURATIONS}=require('../api/_direction-phase-clock');
const start='2026-10-11T14:00:00.000Z';
const base=Date.parse(start);
function session(phase,overrides={}){return {direction:'dubai',enabled:true,phase,current_lot_number:69,phase_started_at:start,...overrides};}
test('green, red and bonus remain active until the 15 second boundary',()=>{
 for(const phase of ['green','red','bonus']){
  assert.equal(nextPhase(session(phase),base+14999),null,phase);
  assert.equal(phaseClock(session(phase),base+14999).secondsRemaining,1,phase);
  assert.equal(nextPhase(session(phase),base+15000)?.to,phase==='bonus'?'sold':'bonus',phase);
 }
});
test('sold persists until the two second boundary',()=>{
 assert.equal(nextPhase(session('sold'),base+1999),null);
 assert.equal(nextPhase(session('sold'),base+2000)?.to,'waiting');
});
test('invalid or disabled sessions never advance',()=>{
 for(const phase of ['waiting','paused','finished','unknown','']){
  assert.equal(nextPhase(session(phase),base+60000),null,phase);
 }
 assert.equal(nextPhase(session('red',{enabled:false}),base+60000),null);
 assert.equal(nextPhase(session('red',{phase_started_at:'invalid'}),base+60000),null);
});
test('timing contract stays explicit',()=>{
 assert.deepEqual({...DURATIONS},{green:15,red:15,bonus:15,sold:2});
});

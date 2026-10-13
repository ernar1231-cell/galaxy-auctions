'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {nextPhase}=require('../api/_direction-phase-transition');
const {DURATIONS}=require('../api/_direction-phase-clock');
for(const direction of ['dubai','transfer']){
 test(direction+' follows RED GREEN BONUS SOLD WAITING without affecting disabled sessions',()=>{
  const expected=[['red','green'],['green','bonus'],['bonus','sold'],['sold','waiting']];
  for(const [phase,to] of expected){
   const s={direction,enabled:true,phase,current_lot_number:69,phase_started_at:'2026-10-13T14:00:00.000Z'};
   const start=Date.parse(s.phase_started_at),duration=DURATIONS[phase]*1000;
   assert.equal(nextPhase(s,start+duration-1),null);
   assert.deepEqual(nextPhase(s,start+duration),{from:phase,to,direction,lotNumber:69});
   assert.equal(nextPhase({...s,enabled:false},start+duration),null);
  }
 });
}
test('USA is never transitioned by this direction-only test contract',()=>{
 // Caller must reject USA before invoking transition; this helper is pure and not an authorization boundary.
 assert.equal(nextPhase({direction:'usa',enabled:false,phase:'red',current_lot_number:1,phase_started_at:'2026-10-13T14:00:00.000Z'},Date.parse('2026-10-13T14:01:00.000Z')),null);
});

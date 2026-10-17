'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {currentSlot,nextSlot,sessionStart}=require('../api/_one-auction-schedule');
test('October 17 is postponed with no active auction direction',()=>{
 for(const hour of ['08','09','13','17','21']){
  const now='2026-10-17T'+hour+':30:00Z';
  assert.equal(currentSlot(now).direction,null);
  assert.equal(nextSlot(now).startAt.toISOString(),'2026-10-18T09:00:00.000Z');
 }
});
test('October 18 normal Dubai schedule resumes',()=>{
 const now='2026-10-18T08:00:00Z';
 assert.equal(sessionStart('usa',now).toISOString(),'2026-10-18T09:00:00.000Z');
 assert.equal(sessionStart('dubai',now).toISOString(),'2026-10-18T13:00:00.000Z');
 assert.equal(sessionStart('transfer',now).toISOString(),'2026-10-18T17:00:00.000Z');
 assert.equal(currentSlot('2026-10-18T09:30:00Z').direction,'usa');
});

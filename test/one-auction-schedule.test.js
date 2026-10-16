'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {sessionStart,currentSlot,nextSlot,directionQueue}=require('../api/_one-auction-schedule');
const marker=d=>'[GALAXY_DIRECTION:{"direction":"'+d+'"}]';
test('fixed session starts are 13 17 21 Dubai time',()=>{
 const now='2026-10-16T07:00:00Z';
 assert.equal(sessionStart('usa',now).toISOString(),'2026-10-16T09:00:00.000Z');
 assert.equal(sessionStart('dubai',now).toISOString(),'2026-10-16T13:00:00.000Z');
 assert.equal(sessionStart('transfer',now).toISOString(),'2026-10-16T17:00:00.000Z');
});
test('direction slots share one day and do not overlap',()=>{
 assert.equal(currentSlot('2026-10-16T09:00:00Z').direction,'usa');
 assert.equal(currentSlot('2026-10-16T13:00:00Z').direction,'dubai');
 assert.equal(currentSlot('2026-10-16T17:00:00Z').direction,'transfer');
 assert.equal(nextSlot('2026-10-16T18:00:00Z').startAt.toISOString(),'2026-10-17T09:00:00.000Z');
});
test('unlimited direction queues preserve order and exclude other directions',()=>{
 const lots=Array.from({length:350},(_,i)=>({lot_number:i+1,sort_order:i+1,status:'upcoming',description:marker(i%3===0?'usa':i%3===1?'dubai':'transfer')}));
 assert.equal(directionQueue(lots,'dubai').length,117);
 assert.equal(directionQueue(lots,'transfer').length,116);
 assert.equal(directionQueue(lots,'usa').length,117);
});

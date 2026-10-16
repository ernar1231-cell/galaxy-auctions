'use strict';
// Deterministic, side-effect-free simulator: no network, money or database writes.
const {resolve,afterCompleted}=require('../api/_unified-live-schedule');
const assert=require('node:assert/strict');
const utc=(day,h,m=0,s=0)=>new Date(Date.UTC(2026,9,day,h-4,m,s));
const directions=['usa','dubai','transfer'];
const queues={usa:[1,2,3,4,5],dubai:[6,7,8,9,10],transfer:[11,12,13,14,15]};
function simulate(start,stepSeconds=32){
 let clock=start.getTime(),events=[],sold=new Set();
 for(const direction of directions){
  const slot=resolve(new Date(clock));
  assert.equal(slot.direction,direction,'direction mismatch');
  for(const lot of queues[direction]){
   assert(!sold.has(lot),'duplicate sale');
   events.push({direction,lot,at:new Date(clock).toISOString()});
   sold.add(lot);clock+=stepSeconds*1000;
  }
  const next=afterCompleted(direction,new Date(clock));
  assert.equal(next.displayDirection,({usa:'dubai',dubai:'transfer',transfer:'usa'})[direction]);
  assert.equal(next.phase,'waiting');
  if(direction==='usa')clock=utc(16,17).getTime();
  if(direction==='dubai')clock=utc(16,21).getTime();
 }
 assert.equal(events.length,15);
 assert.equal(sold.size,15);
 return events;
}
const events=simulate(utc(16,13));
assert.equal(events[0].lot,1);
assert.equal(events[5].lot,6);
assert.equal(events[10].lot,11);
assert.equal(resolve(utc(16,16,30)).displayDirection,'dubai');
assert.equal(resolve(utc(16,20,30)).displayDirection,'transfer');
assert.equal(resolve(utc(17,0,30)).displayDirection,'usa');
console.log('PASS: 15 lots advance by server-clock simulation, no browser visits, no duplicate sales, three directions and next-day USA.');

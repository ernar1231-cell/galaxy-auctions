'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {usaCycleStart,orderedQueue}=require('../api/live-sync');
test('USA cycle uses 13:00 Dubai time (09:00 UTC)',()=>{
 assert.equal(usaCycleStart('2026-10-16T07:00:00Z').toISOString(),'2026-10-16T09:00:00.000Z');
 assert.equal(usaCycleStart('2026-10-16T17:00:00Z').toISOString(),'2026-10-16T09:00:00.000Z');
});
test('first visible LIVE lot is first in ordered queue',()=>{
 const lots=[{lot_number:10},{lot_number:20},{lot_number:30}];
 assert.deepEqual(orderedQueue(lots,{status:'live',lot_id:20}).map(x=>x.lot_number),[20,10,30]);
 assert.deepEqual(orderedQueue(lots,{status:'waiting',lot_id:20}).map(x=>x.lot_number),[10,20,30]);
});

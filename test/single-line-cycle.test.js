'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {transition,afterBreak,BREAK_MS}=require('../api/_single-line-cycle');
test('arbitrary lot counts remain in the same direction',()=>{
 for(const count of [1,10,150,200,1000])assert.deepEqual(transition({direction:'usa',remainingLots:count}),{phase:'live',direction:'usa'});
});
test('America completes then Dubai starts exactly one hour later',()=>{
 const result=transition({direction:'usa',remainingLots:0,finishedAt:'2026-10-16T10:00:00Z'});
 assert.equal(result.nextDirection,'dubai');
 assert.equal(result.startsAt,'2026-10-16T11:00:00.000Z');
 assert.equal(afterBreak({nextDirection:'dubai',startsAt:result.startsAt,now:'2026-10-16T10:59:59Z',remainingLots:200}).phase,'break');
 assert.deepEqual(afterBreak({nextDirection:'dubai',startsAt:result.startsAt,now:'2026-10-16T11:00:00Z',remainingLots:200}),{phase:'live',direction:'dubai'});
});
test('Dubai completes then Transit; Transit completes and stops',()=>{
 assert.equal(transition({direction:'dubai',remainingLots:0,finishedAt:0}).nextDirection,'transfer');
 assert.deepEqual(transition({direction:'transfer',remainingLots:0}),{phase:'stopped',direction:null,nextDirection:null});
 assert.equal(BREAK_MS,3600000);
});
test('empty direction is not represented as a live auction',()=>{
 assert.equal(afterBreak({nextDirection:'dubai',startsAt:0,now:3600000,remainingLots:0}).phase,'empty');
});

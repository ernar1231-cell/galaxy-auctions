'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {nextStart}=require('../api/direction-live-state');
test('Dubai countdown targets 18:00 same day before start',()=>{
 assert.equal(nextStart(new Date('2026-10-11T10:00:00Z'),'Asia/Dubai','18:00:00'),'2026-10-11T14:00:00.000Z');
});
test('Dubai countdown targets next day after 18:00',()=>{
 assert.equal(nextStart(new Date('2026-10-11T14:01:00Z'),'Asia/Dubai','18:00:00'),'2026-10-12T14:00:00.000Z');
});
test('reject timezone not implemented',()=>{
 assert.throws(()=>nextStart(new Date('2026-10-11T10:00:00Z'),'America/New_York','18:00:00'),/Unsupported timezone/);
});

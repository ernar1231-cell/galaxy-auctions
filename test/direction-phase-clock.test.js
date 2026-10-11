'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {phaseClock}=require('../api/_direction-phase-clock');
test('disabled session stays waiting regardless of stored phase',()=>{
 assert.deepEqual(phaseClock({enabled:false,phase:'red'}),{phase:'waiting',secondsRemaining:null,serverControlled:true});
});
test('active phase counts down from server timestamp',()=>{
 const now=Date.parse('2026-10-11T14:00:15Z');
 assert.equal(phaseClock({enabled:true,phase:'green',phase_started_at:'2026-10-11T14:00:00Z'},now).secondsRemaining,15);
});
test('expired phase never reports negative time',()=>{
 const now=Date.parse('2026-10-11T14:01:00Z');
 assert.equal(phaseClock({enabled:true,phase:'red',phase_started_at:'2026-10-11T14:00:00Z'},now).secondsRemaining,0);
});
test('unknown phase does not pretend to be live countdown',()=>{
 assert.equal(phaseClock({enabled:true,phase:'sold'},Date.now()).secondsRemaining,null);
});

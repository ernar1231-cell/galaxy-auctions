'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {nextPhase}=require('../api/_direction-phase-transition');
const start='2026-10-11T14:00:00Z';
function session(phase,enabled=true){return {direction:'dubai',enabled,phase,current_lot_number:69,phase_started_at:start};}
test('disabled sessions never advance',()=>assert.equal(nextPhase(session('red',false),Date.parse('2026-10-11T14:01:00Z')),null));
test('red phase advances to bonus after fifteen seconds',()=>assert.equal(nextPhase(session('red'),Date.parse('2026-10-11T14:00:16Z')).to,'bonus'));
test('bonus phase advances to sold',()=>assert.equal(nextPhase(session('bonus'),Date.parse('2026-10-11T14:00:16Z')).to,'sold'));
test('sold phase advances to waiting after two seconds',()=>assert.equal(nextPhase(session('sold'),Date.parse('2026-10-11T14:00:03Z')).to,'waiting'));
test('no early transitions',()=>assert.equal(nextPhase(session('red'),Date.parse('2026-10-11T14:00:14Z')),null));

'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {sessionStart,directionQueue}=require('../api/_one-auction-schedule');
const {counts}=require('../api/one-auction-counts');
const label=d=>'[GALAXY_DIRECTION:{"direction":"'+d+'"}]';
test('regular schedule restored after temporary meeting day',()=>{
 const date='2026-10-17T08:00:00Z';
 assert.equal(sessionStart('usa',date).toISOString(),'2026-10-17T09:00:00.000Z');
 assert.equal(sessionStart('dubai',date).toISOString(),'2026-10-17T13:00:00.000Z');
 assert.equal(sessionStart('transfer',date).toISOString(),'2026-10-17T17:00:00.000Z');
});
test('each direction has only its own queue in one database',()=>{
 const lots=[
 {lot_number:1,status:'upcoming',description:label('usa')},
 {lot_number:2,status:'upcoming',description:label('dubai')},
 {lot_number:3,status:'upcoming',description:label('transfer')},
 {lot_number:4,status:'upcoming',description:label('usa')}
 ];
 assert.deepEqual(counts(lots),{usa:2,dubai:1,transfer:1});
 for(const direction of ['usa','dubai','transfer'])
  assert.ok(directionQueue(lots,direction).every(l=>l.description.includes('"'+direction+'"')));
});

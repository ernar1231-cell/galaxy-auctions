'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {counts}=require('../api/one-auction-counts');
const tag=d=>'[GALAXY_DIRECTION:{"direction":"'+d+'"}]';
test('one list split into three direction counts without duplicates',()=>{
 const lots=[
  {status:'upcoming',description:tag('usa')},
  {status:'live',description:tag('dubai')},
  {status:'upcoming',description:tag('transfer')},
  {status:'upcoming',description:tag('usa')},
  {status:'sold',description:tag('dubai')},
  {status:'upcoming',description:''}
 ];
 assert.deepEqual(counts(lots),{usa:3,dubai:1,transfer:1});
 assert.equal(Object.values(counts(lots)).reduce((a,b)=>a+b,0),5);
});
test('different quantities per direction are counted from one inventory',()=>{
 const lots=[...Array.from({length:17},()=>({status:'upcoming',description:tag('usa')})),...Array.from({length:14},()=>({status:'upcoming',description:tag('dubai')})),...Array.from({length:50},()=>({status:'upcoming',description:tag('transfer')}))];
 assert.deepEqual(counts(lots),{usa:17,dubai:14,transfer:50});
});

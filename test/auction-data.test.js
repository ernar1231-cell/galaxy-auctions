const test=require('node:test');
const assert=require('node:assert/strict');
const {orderedQueue}=require('../api/live-sync');
const {saleMeta}=require('../api/my-auction-results');

test('live queue puts the state lot first without changing the remaining configured order',()=>{
  const rows=[{lot_number:20},{lot_number:10},{lot_number:30}];
  assert.deepEqual(orderedQueue(rows,{status:'live',lot_id:10}).map(x=>x.lot_number),[10,20,30]);
  assert.deepEqual(orderedQueue(rows,{status:'waiting',lot_id:10}).map(x=>x.lot_number),[20,10,30]);
});

test('confirmed sale retains the stable winner user id and final price',()=>{
  const sale={user_id:'987654321',price:43210,confirmed_at:'2026-10-03T12:00:00.000Z'};
  const token=Buffer.from(JSON.stringify(sale)).toString('base64url');
  assert.deepEqual(saleMeta(`Vehicle\n[[sale:${token}]]`),sale);
  assert.equal(saleMeta('Vehicle without result'),null);
});

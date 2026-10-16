const assert=require('node:assert/strict');
const {completion}=require('../api/_unified-queue-completion');
const assigned=[{lot_number:1},{lot_number:2},{lot_number:3}];
assert.equal(completion([],[]).complete,false);
assert.equal(completion(assigned,[{lot_number:1,status:'sold'}]).complete,false);
assert.equal(completion(assigned,[{lot_number:1,status:'sold'},{lot_number:2,status:'pending'},{lot_number:3,status:'live'}]).complete,false);
assert.equal(completion(assigned,[{lot_number:1,status:'sold'},{lot_number:2,status:'pending'},{lot_number:3,status:'unsold'}]).complete,true);
assert.equal(completion(assigned,[{lot_number:1,status:'sold'},{lot_number:2,status:'draft'},{lot_number:3,status:'pending'}]).complete,false);
console.log('Queue completion checks passed');

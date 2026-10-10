const assert=require('node:assert/strict');
const test=require('node:test');
const {directionOf,publishedInDirection}=require('../api/_auction-direction');
test('legacy lots remain USA',()=>assert.equal(directionOf({description:'Original lot'}),'usa'));
test('Dubai and transfer tagged lots are separated',()=>{
 const rows=[
 {lot_number:1,status:'upcoming',description:'old'},
 {lot_number:69,status:'upcoming',description:'[GALAXY_DIRECTION:{"direction":"dubai"}]'},
 {lot_number:70,status:'upcoming',description:'[GALAXY_DIRECTION:{"direction":"transfer"}]'},
 {lot_number:71,status:'draft',description:'[GALAXY_DIRECTION:{"direction":"dubai"}]'}];
 assert.deepEqual(publishedInDirection(rows,'usa').map(x=>x.lot_number),[1]);
 assert.deepEqual(publishedInDirection(rows,'dubai').map(x=>x.lot_number),[69]);
 assert.deepEqual(publishedInDirection(rows,'transfer').map(x=>x.lot_number),[70]);
});
test('invalid metadata does not route to another auction',()=>{
 assert.equal(directionOf({description:'[GALAXY_DIRECTION:{"direction":"unknown"}]'}),'usa');
 assert.throws(()=>publishedInDirection([],'unknown'));
});
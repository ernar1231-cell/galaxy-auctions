'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const handler=require('../api/direction-phase-tick');
test('unified scheduler does not transition legacy sessions',async()=>{
 const previous=process.env.GALAXY_LEGACY_DIRECTION_SESSIONS;
 const secret=process.env.GALAXY_SCHEDULER_SECRET;
 try{
  delete process.env.GALAXY_LEGACY_DIRECTION_SESSIONS;
  process.env.GALAXY_SCHEDULER_SECRET='z'.repeat(40);
  const res={setHeader(){},status(n){this.code=n;return this},json(v){this.body=v;return this}};
  await handler({method:'POST',headers:{authorization:'Bearer '+'z'.repeat(40)}},res);
  assert.equal(res.code,200);
  assert.equal(res.body.unified,true);
  assert.equal(res.body.checked,0);
  assert.equal(res.body.transitions.length,0);
 }finally{
  if(previous===undefined)delete process.env.GALAXY_LEGACY_DIRECTION_SESSIONS;else process.env.GALAXY_LEGACY_DIRECTION_SESSIONS=previous;
  if(secret===undefined)delete process.env.GALAXY_SCHEDULER_SECRET;else process.env.GALAXY_SCHEDULER_SECRET=secret;
 }
});

'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {stagingPosition}=require('../api/_staging-lot-mapping');
const map={dubai:[{lotNumber:69,position:1}],transfer:[{lotNumber:70,position:1}]};
test('only explicit staging mappings can be bid on',()=>{
 assert.equal(stagingPosition('dubai',69,map),1);
 assert.equal(stagingPosition('transfer',70,map),1);
 assert.throws(()=>stagingPosition('dubai',70,map),/STAGING_LOT_NOT_MAPPED/);
 assert.throws(()=>stagingPosition('usa',69,map),/INVALID_DIRECTION/);
 assert.throws(()=>stagingPosition('dubai',69,{}),/STAGING_MAPPING_MISSING/);
});

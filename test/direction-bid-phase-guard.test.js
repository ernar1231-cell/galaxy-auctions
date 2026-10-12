'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {sessionCanBid}=require('../api/_multi-auction-core');
test('direction bids only allowed in recognized live bidding phases',()=>{
 for(const phase of ['red','green','bonus']){
  assert.equal(sessionCanBid({enabled:true,phase,current_lot_number:69},69),true,phase);
 }
 for(const phase of ['waiting','sold','paused','cancelled','finished','',null,'unknown']){
  assert.equal(sessionCanBid({enabled:true,phase,current_lot_number:69},69),false,String(phase));
 }
});
test('direction bids reject disabled sessions and mismatched lots',()=>{
 assert.equal(sessionCanBid({enabled:false,phase:'red',current_lot_number:69},69),false);
 assert.equal(sessionCanBid({enabled:true,phase:'red',current_lot_number:69},70),false);
 assert.equal(sessionCanBid(null,69),false);
});

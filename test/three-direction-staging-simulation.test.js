'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {nextPhase}=require('../api/_direction-phase-transition');
const {sessionCanBid}=require('../api/_multi-auction-core');
// Pure in-memory simulation. No production database or real bids.
function fixture(){
 const state=new Map(['usa','dubai','transfer'].map((direction,i)=>[direction,{direction,enabled:true,phase:'red',phase_started_at:'2026-10-12T14:00:00Z',current_lot_number:101+i,current_bid:5000,bids:[],results:[]}]));
 function bid(direction,lot,amount,user){
  const s=state.get(direction);
  if(!s||!sessionCanBid(s,lot)||amount<=s.current_bid)return false;
  s.current_bid=amount;s.bids.push({lot,amount,user});return true;
 }
 function sold(direction){
  const s=state.get(direction),winner=s.bids.at(-1);
  if(winner)s.results.push(winner);
  s.enabled=false;s.phase='waiting';
 }
 return {state,bid,sold};
}
test('three auctions accept independent simulated bids',()=>{
 const f=fixture();
 assert.equal(f.bid('usa',101,5100,'A'),true);
 assert.equal(f.bid('dubai',102,5200,'B'),true);
 assert.equal(f.bid('transfer',103,5300,'C'),true);
 assert.equal(f.bid('dubai',103,5400,'X'),false);
 assert.deepEqual(['usa','dubai','transfer'].map(d=>f.state.get(d).current_bid),[5100,5200,5300]);
});
test('results never cross between directions',()=>{
 const f=fixture();
 f.bid('usa',101,5100,'A');f.bid('dubai',102,5200,'B');f.bid('transfer',103,5300,'C');
 for(const d of ['usa','dubai','transfer'])f.sold(d);
 assert.deepEqual(['usa','dubai','transfer'].map(d=>f.state.get(d).results[0].user),['A','B','C']);
});
test('no-bid lot creates no winner and leaves other directions active',()=>{
 const f=fixture();f.sold('dubai');
 assert.equal(f.state.get('dubai').results.length,0);
 assert.equal(f.state.get('usa').enabled,true);
 assert.equal(f.state.get('transfer').enabled,true);
});
test('phase transition proposals are isolated and do not mutate sessions',()=>{
 const f=fixture(),now=Date.parse('2026-10-12T14:00:15Z');
 assert.equal(nextPhase(f.state.get('dubai'),now).to,'bonus');
 assert.equal(f.state.get('transfer').phase,'red');
});

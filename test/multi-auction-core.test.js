'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const {selectDirectionQueue,sessionCanBid}=require('../api/_multi-auction-core');
const lot=(n,d)=>({lot_number:n,status:'upcoming',description:'[GALAXY_DIRECTION:{"direction":"'+d+'"}]'});
test('direction queue excludes other auction cars',()=>{
 const lots=[lot(69,'dubai'),lot(70,'transfer'),lot(71,'usa')];
 const assignments=[{lot_number:69,direction:'dubai',queue_position:1},{lot_number:70,direction:'transfer',queue_position:1},{lot_number:71,direction:'usa',queue_position:1}];
 assert.deepEqual(selectDirectionQueue(lots,assignments,'dubai').map(x=>x.lot_number),[69]);
 assert.deepEqual(selectDirectionQueue(lots,assignments,'transfer').map(x=>x.lot_number),[70]);
 assert.deepEqual(selectDirectionQueue(lots,assignments,'usa').map(x=>x.lot_number),[71]);
});
test('disabled session rejects bids',()=>{
 assert.equal(sessionCanBid({enabled:false,phase:'red',current_lot_number:69},69),false);
 assert.equal(sessionCanBid({enabled:true,phase:'waiting',current_lot_number:69},69),false);
 assert.equal(sessionCanBid({enabled:true,phase:'red',current_lot_number:69},70),false);
 assert.equal(sessionCanBid({enabled:true,phase:'red',current_lot_number:69},69),true);
});

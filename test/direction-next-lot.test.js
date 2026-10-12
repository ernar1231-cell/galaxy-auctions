'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {nextDirectionLot}=require('../api/_direction-next-lot');
function lot(n,d){return {lot_number:n,status:'upcoming',description:'[GALAXY_DIRECTION:'+JSON.stringify({direction:d})+']'};}
const lots=[lot(69,'dubai'),lot(71,'dubai'),lot(70,'transfer'),lot(72,'usa')];
const assignments=[{lot_number:69,direction:'dubai',queue_position:1},{lot_number:71,direction:'dubai',queue_position:2},{lot_number:70,direction:'transfer',queue_position:1}];
test('Dubai moves only to its own next assigned lot',()=>assert.equal(nextDirectionLot(lots,assignments,'dubai',69)?.lot_number,71));
test('last Dubai lot has no next lot',()=>assert.equal(nextDirectionLot(lots,assignments,'dubai',71),null));
test('transfer never selects USA or Dubai lot',()=>assert.equal(nextDirectionLot(lots,assignments,'transfer',70),null));
test('USA cannot use independent next lot selector',()=>assert.equal(nextDirectionLot(lots,assignments,'usa',72),null));

'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {calculateProxyPrice}=require('../api/_direction-proxy-pricing');
test('no proxy bidder preserves starting price',()=>assert.deepEqual(calculateProxyPrice([],10000),{leader:null,price:10000,runnerUp:null}));
test('one bidder does not automatically pay their maximum',()=>assert.deepEqual(calculateProxyPrice([{userId:'a',maximum:15000}],10000),{leader:'a',price:10000,runnerUp:null}));
test('competition bids only one step above second maximum',()=>assert.deepEqual(calculateProxyPrice([{userId:'a',maximum:15000},{userId:'b',maximum:12000}],10000),{leader:'a',runnerUp:'b',price:12100}));
test('winning maximum caps price',()=>assert.equal(calculateProxyPrice([{userId:'a',maximum:15000},{userId:'b',maximum:14950}],10000).price,15000));
test('earlier equal maximum wins tie',()=>assert.equal(calculateProxyPrice([{userId:'later',maximum:15000,createdAt:'2026-10-12T12:01:00Z'},{userId:'earlier',maximum:15000,createdAt:'2026-10-12T12:00:00Z'}],10000).leader,'earlier'));

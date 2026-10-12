'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../api/direction-live-state.js'),'utf8');
test('on-demand transitions are opt-in and never arm waiting sessions',()=>{
 assert.ok(source.includes("process.env.GALAXY_DIRECTION_ON_DEMAND_SYNC!=='true'||session.enabled!==true"));
 assert.ok(!source.includes("rpc/galaxy_start_armed_direction"));
 assert.ok(source.includes('session=await advanceIfDue(session)'));
});
test('phase and SOLD transitions use direction and expected lot guards',()=>{
 assert.ok(source.includes('p_expected_lot:proposal.lotNumber'));
 assert.ok(source.includes('p_expected_phase:proposal.from'));
 assert.ok(source.includes("galaxy_advance_direction_lot"));
 assert.ok(source.includes("galaxy_advance_direction_phase"));
});
test('state and lot queue are reloaded after an on-demand transition',()=>{
 assert.ok(source.includes("const sessions=await read('galaxy_auction_sessions?direction=eq.'+session.direction"));
 assert.ok(source.indexOf("session=await advanceIfDue(session)")<source.indexOf("const lots=await read('auction_lots?"));
});

'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const sql=fs.readFileSync(path.join(__dirname,'../migrations/20261012_direction_sold_next.sql'),'utf8');
test('SOLD SQL records the authoritative winning bid in the isolated ledger',()=>{
 assert.equal(sql.includes(String.raw`\n`),false);
 assert.ok(sql.includes('FROM public.galaxy_auction_bid_events b'));
 assert.ok(sql.includes("SET status='draft',updated_at=now()"));
 assert.ok(sql.includes('No bids: no winner, no sale result'));
 assert.ok(sql.includes('INSERT INTO public.galaxy_auction_results'));
 assert.ok(sql.includes('winner_event.user_telegram_id,winner_event.amount,winner_event.id'));
 assert.ok(sql.includes('Winning bid does not match authoritative session price'));
 assert.ok(sql.includes('Sale result already recorded'));
});
test('SOLD transition activates next lot and isolates direction',()=>{
 assert.ok(sql.includes("p_direction NOT IN ('dubai','transfer')"));
 assert.ok(sql.includes("SET status='live',updated_at=now() WHERE l.lot_number=next_number AND l.status='upcoming'"));
 assert.ok(sql.includes('Next lot must be upcoming before activation'));
 assert.ok(sql.includes('FOR UPDATE'));
});

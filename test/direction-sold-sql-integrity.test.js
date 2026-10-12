'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const sql=fs.readFileSync(path.join(__dirname,'../migrations/20261012_direction_sold_next.sql'),'utf8');
test('SOLD migration has no literal escaped newlines that comment out safety checks',()=>{
 assert.doesNotMatch(sql,/\\n/);
 assert.match(sql,/IF NOT EXISTS \(SELECT 1 FROM public\.galaxy_auction_bid_events/);
 assert.match(sql,/Cannot complete lot without a recorded bid/);
 assert.match(sql,/INSERT INTO public\\.galaxy_auction_results/);
 assert.match(sql,/winner_event\\.user_telegram_id,winner_event\\.amount,winner_event\\.id/);
 assert.match(sql,/Winning bid does not match authoritative session price/);
});
test('SOLD transition activates next lot and isolates direction',()=>{
 assert.match(sql,/IF p_direction NOT IN \('dubai','transfer'\)/);
 assert.match(sql,/SET status='live',updated_at=now\(\) WHERE l\.lot_number=next_number AND l\.status='upcoming'/);
 assert.match(sql,/Next lot must be upcoming before activation/);
 assert.match(sql,/FOR UPDATE/);
});

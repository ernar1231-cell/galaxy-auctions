'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const sql=fs.readFileSync(path.join(__dirname,'../migrations/20261012_direction_proxy_maxima_draft.sql'),'utf8');
test('Dubai/Transit proxy maximums are isolated from USA LIVE',()=>{
 assert.match(sql,/galaxy_direction_proxy_maxima/);
 assert.match(sql,/PRIMARY KEY\(direction,lot_number,user_telegram_id\)/);
 assert.match(sql,/direction IN \('dubai','transfer'\)/);
 assert.doesNotMatch(sql,/\b(?:INSERT INTO|UPDATE|ALTER TABLE)\s+public\.auction_bids\b/i);
});
test('proxy maximum requires active account, deposit, limit and lot ownership',()=>{
 assert.match(sql,/account_status/);
 assert.match(sql,/deposit_amount/);
 assert.match(sql,/bid_limit<p_max_amount/);
 assert.match(sql,/a.direction=p_direction AND a.lot_number=p_lot_number/);
 assert.match(sql,/p_max_amount<old_max/);
});
test('proxy maxima cannot be read or written directly by public clients',()=>{
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/REVOKE ALL ON public\.galaxy_direction_proxy_maxima FROM PUBLIC,anon,authenticated/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.galaxy_set_direction_proxy_max\(text,bigint,text,numeric\)\s+TO service_role/);
});

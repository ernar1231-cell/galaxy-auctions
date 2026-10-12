'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const sql=fs.readFileSync(path.join(__dirname,'../migrations/20261012_direction_atomic_proxy_draft.sql'),'utf8');
test('atomic manual and proxy operations lock direction and exclude USA',()=>{
 assert.match(sql,/p_mode NOT IN \('manual','proxy'\)/);
 assert.match(sql,/p_direction NOT IN \('dubai','transfer'\)/);
 assert.match(sql,/WHERE x.direction=p_direction FOR UPDATE/);
 assert.match(sql,/now\(\)>=s.phase_started_at\+interval '15 seconds'/);
});
test('winner event, price and phase update occur within one transaction',()=>{
 assert.match(sql,/BEGIN;/);
 assert.match(sql,/UPDATE public.galaxy_auction_sessions/);
 assert.match(sql,/INSERT INTO public.galaxy_auction_bid_events/);
 assert.match(sql,/winner_id,final_price/);
 assert.match(sql,/COMMIT;/);
});
test('proxy maximum is private and only service role can call function',()=>{
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/REVOKE ALL ON public.galaxy_direction_proxy_maxima FROM PUBLIC,anon,authenticated/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public.galaxy_direction_submit_bid/);
});

test('manual winning increment is not silently reduced to minimum proxy step',()=>{
 assert.match(sql,/IF p_mode='manual' AND winner_id=p_user_telegram_id THEN/);
 assert.match(sql,/final_price:=greatest\(final_price,candidate\)/);
 assert.match(sql,/IF final_price>winning_max THEN RAISE EXCEPTION/);
});

test('raising an already-leading proxy maximum preserves price and timer',()=>{
 assert.match(sql,/IF current_leader=winner_id AND p_mode='proxy' AND p_user_telegram_id=winner_id THEN/);
 assert.match(sql,/RETURN QUERY SELECT new_event,s\.current_bid;/);
 assert.ok(sql.indexOf('RETURN QUERY SELECT new_event,s.current_bid;')<sql.indexOf('UPDATE public.galaxy_auction_sessions x SET current_bid=final_price'));
});

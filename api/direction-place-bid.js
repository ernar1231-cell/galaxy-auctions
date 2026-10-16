'use strict';
const {requireActiveDirection}=require('./_single-line-bid-guard');
const {verifyTelegram}=require('./_direction-telegram-auth');
const {phaseClock}=require('./_direction-phase-clock');
const {assertDirection,sessionCanBid,belongsToDirection}=require('./_multi-auction-core');
const base=()=>String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
const key=()=>process.env.SUPABASE_SERVICE_ROLE_KEY;
async function read(path){
 const k=key();if(!k||!base())throw Error('Database not configured');
 const response=await fetch(base()+'/rest/v1/'+path,{headers:{apikey:k,Authorization:'Bearer '+k},cache:'no-store'});
 const data=await response.json();if(!response.ok)throw Error('Database read failed');return data;
}
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 if(process.env.GALAXY_DIRECTION_BIDDING_ENABLED!=='true')return res.status(503).json({code:'BIDDING_NOT_READY',error:'Direction bidding not enabled'});
 let direction;try{direction=assertDirection(req.body?.direction)}catch{return res.status(400).json({error:'Invalid direction'});}
 if(direction==='usa')return res.status(400).json({error:'Use existing USA bidding API'});
 const lotNumber=Number(req.body?.lotNumber);
 if(!Number.isSafeInteger(lotNumber)||lotNumber<=0)return res.status(400).json({error:'Invalid lot'});
 try{
  await requireActiveDirection(direction,base(),key());
  const [sessions,assignments,lots]=await Promise.all([
   read('galaxy_auction_sessions?direction=eq.'+direction+'&select=*'),
   read('galaxy_auction_lot_assignments?lot_number=eq.'+lotNumber+'&select=lot_number,direction'),
   read('auction_lots?lot_number=eq.'+lotNumber+'&select=lot_number,description,status')
  ]);
  const session=sessions[0],assignment=assignments[0],lot=lots[0];
  if(!session||!assignment||!lot||assignment.direction!==direction||!belongsToDirection(lot,direction))
   return res.status(409).json({error:'Lot does not belong to this auction'});
  if(lot.status!=='live'||!sessionCanBid(session,lotNumber)||!(phaseClock(session).secondsRemaining>0))return res.status(409).json({error:'Auction session is not accepting bids'});
  const telegramId=verifyTelegram(req.body?.initData,process.env.TELEGRAM_BOT_TOKEN);
   if(!telegramId)return res.status(401).json({code:'TELEGRAM_AUTH_REQUIRED',error:'Valid Telegram login required'});
   const increment=Number(req.body?.increment);
   if(![100,1000,10000].includes(increment))return res.status(400).json({error:'Invalid increment'});
  // Atomic database RPC owns account, deposit, bid limit and price locking.
  const k=key();if(!k||!base())throw Error('Database not configured');
  const unified=process.env.GALAXY_DIRECTION_UNIFIED_BIDS_READY==='true';
  const rpc=await fetch(base()+'/rest/v1/rpc/'+(unified?'galaxy_direction_submit_bid':'galaxy_place_direction_bid'),{
   method:'POST',headers:{apikey:k,Authorization:'Bearer '+k,'Content-Type':'application/json'},
   body:JSON.stringify(unified?{p_direction:direction,p_lot_number:lotNumber,p_user_telegram_id:telegramId,p_mode:'manual',p_amount:increment}:{p_direction:direction,p_lot_number:lotNumber,p_user_telegram_id:telegramId,p_increment:increment})
  });
  const result=await rpc.json();
  if(!rpc.ok)return res.status(409).json({code:'BID_REJECTED',error:'Bid was not accepted'});
  const bid=Array.isArray(result)?result[0]:null;
  if(!bid||!Number.isSafeInteger(Number(bid.event_id))||Number(bid.event_id)<=0||!Number.isFinite(Number(bid.new_bid))||Number(bid.new_bid)<=0)
   return res.status(503).json({code:'BID_CONFIRMATION_UNAVAILABLE',error:'Bid confirmation unavailable'});
  return res.status(200).json({direction,lotNumber,bid});
 }catch(e){return res.status(503).json({error:'Auction validation unavailable'});}
};

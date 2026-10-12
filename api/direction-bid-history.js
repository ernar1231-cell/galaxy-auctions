'use strict';
// Read-only public price history for independent Dubai/Transit auctions.
// Telegram identifiers and private bid limits are never returned.
const {assertDirection}=require('./_multi-auction-core');
const base=()=>String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 let direction;
 try{direction=assertDirection(req.query?.direction);}catch{return res.status(400).json({error:'Invalid direction'});}
 if(direction==='usa')return res.status(400).json({error:'Use existing USA history API'});
 const lotNumber=Number(req.query?.lotNumber);
 if(!Number.isSafeInteger(lotNumber)||lotNumber<=0)return res.status(400).json({error:'Invalid lot'});
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!key||!base())return res.status(503).json({error:'History unavailable'});
 const headers={apikey:key,Authorization:'Bearer '+key};
 try{
  const assignment=await fetch(base()+'/rest/v1/galaxy_auction_lot_assignments?lot_number=eq.'+lotNumber+'&direction=eq.'+direction+'&select=lot_number&limit=1',{headers,cache:'no-store'});
  if(!assignment.ok)throw Error('Assignment unavailable');
  const assigned=await assignment.json();
  if(!Array.isArray(assigned)||assigned.length!==1)return res.status(404).json({error:'Lot not found'});
  const url=base()+'/rest/v1/galaxy_auction_bid_events?direction=eq.'+direction+'&lot_number=eq.'+lotNumber+'&select=id,amount,created_at&order=id.desc&limit=50';
  const response=await fetch(url,{headers,cache:'no-store'});
  if(!response.ok)throw Error('History unavailable');
  const events=await response.json();
  if(!Array.isArray(events))throw Error('Invalid history');
  return res.status(200).json({direction,lotNumber,events:events.map(e=>({id:e.id,amount:e.amount,createdAt:e.created_at}))});
 }catch{return res.status(503).json({error:'History unavailable'});}
};

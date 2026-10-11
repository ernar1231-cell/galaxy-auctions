'use strict';
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
 let direction;try{direction=assertDirection(req.body?.direction)}catch{return res.status(400).json({error:'Invalid direction'});}
 if(direction==='usa')return res.status(400).json({error:'Use existing USA bidding API'});
 const lotNumber=Number(req.body?.lotNumber);
 if(!Number.isSafeInteger(lotNumber)||lotNumber<=0)return res.status(400).json({error:'Invalid lot'});
 try{
  const [sessions,assignments,lots]=await Promise.all([
   read('galaxy_auction_sessions?direction=eq.'+direction+'&select=*'),
   read('galaxy_auction_lot_assignments?lot_number=eq.'+lotNumber+'&select=lot_number,direction'),
   read('auction_lots?lot_number=eq.'+lotNumber+'&select=lot_number,description,status')
  ]);
  const session=sessions[0],assignment=assignments[0],lot=lots[0];
  if(!session||!assignment||!lot||assignment.direction!==direction||!belongsToDirection(lot,direction))
   return res.status(409).json({error:'Lot does not belong to this auction'});
  if(!sessionCanBid(session,lotNumber))return res.status(409).json({error:'Auction session is not accepting bids'});
  // Fail closed: real bids require Telegram identity/deposit checks and an atomic
  // database transaction for both the bid event and session price update.
  return res.status(503).json({code:'BIDDING_NOT_READY',error:'Independent bidding transaction not enabled'});
 }catch(e){return res.status(503).json({error:'Auction validation unavailable'});}
};

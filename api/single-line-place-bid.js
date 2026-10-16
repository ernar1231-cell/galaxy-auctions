'use strict';
// Unified manual-bid entry point. Delegates to existing verified handlers,
// preserving their Telegram authentication, deposit, limit and atomic bid logic.
const usa=require('./place-bid');
const directionBid=require('./direction-place-bid');
const base=()=>String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
async function cycleState(){
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base()||!key)throw Error('Database unavailable');
 const r=await fetch(base()+'/rest/v1/galaxy_single_line_cycle?id=eq.1&select=phase,direction',{
  headers:{apikey:key,Authorization:'Bearer '+key},cache:'no-store'
 });
 if(!r.ok)throw Error('Cycle unavailable');
 return (await r.json())?.[0];
}
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 if(process.env.GALAXY_SINGLE_LINE_CYCLE_ENABLED!=='true')
  return res.status(503).json({error:'Unified bidding disabled'});
 try{
  const cycle=await cycleState();
  if(!cycle||cycle.phase!=='live'||!['usa','dubai','transfer'].includes(cycle.direction))
   return res.status(409).json({error:'No active auction'});
  const requested=String(req.body?.direction||'');
  if(requested!==cycle.direction)return res.status(409).json({error:'Auction direction changed'});
  if(cycle.direction==='usa'){
   req.body={...req.body,lotId:req.body?.lotNumber??req.body?.lotId};
   return usa(req,res);
  }
  req.body={...req.body,direction:cycle.direction,lotNumber:req.body?.lotNumber??req.body?.lotId};
  return directionBid(req,res);
 }catch{return res.status(503).json({error:'Unified bidding unavailable'});}
};

'use strict';
const {resolve}=require('./_unified-live-schedule');
// Authenticated, read-only production diagnostic. Never advances lots or modifies bids.
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 const secret=process.env.GALAXY_SCHEDULER_SECRET;
 if(!secret||secret.length<32)return res.status(503).json({error:'Scheduler not configured'});
 if(req.headers.authorization!=='Bearer '+secret)return res.status(401).json({error:'Unauthorized'});
 const url=String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return res.status(503).json({error:'Database not configured'});
 try{
  const r=await fetch(url+'/rest/v1/auction_state?id=eq.1&select=id,status,phase,lot_id,phase_started_at,updated_at',{headers:{apikey:key,Authorization:'Bearer '+key},cache:'no-store'});
  if(!r.ok)throw Error('State unavailable');
  const state=(await r.json())[0];
  if(!state)throw Error('State missing');
  const slot=resolve(new Date());
  const usaLive=state.status==='live';
  const outsideSlot=usaLive&&(slot.direction!=='usa'||slot.phase!=='live');
  return res.status(200).json({slot,usa:{status:state.status,phase:state.phase,lotId:state.lot_id,phaseStartedAt:state.phase_started_at},warnings:outsideSlot?['USA_LIVE_OUTSIDE_SCHEDULE']:[],writesPerformed:false});
 }catch{return res.status(503).json({error:'Audit unavailable'});}
};

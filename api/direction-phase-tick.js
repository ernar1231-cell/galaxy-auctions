'use strict';
const {nextPhase}=require('./_direction-phase-transition');
const base=()=>String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
function appendRpcRows(results,payload,direction){
 if(payload===null||payload===undefined)return;
 const rows=Array.isArray(payload)?payload:[payload];
 for(const row of rows){
  if(row&&typeof row==='object')results.push({direction,...row});
 }
}
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'&&req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 const token=process.env.GALAXY_SCHEDULER_SECRET;
 if(!token||token.length<32)return res.status(503).json({error:'Scheduler not configured'});
 if(req.headers?.authorization!=='Bearer '+token)return res.status(401).json({error:'Unauthorized scheduler'});
 if(process.env.GALAXY_LEGACY_DIRECTION_SESSIONS!=='true'){
  return res.status(200).json({unified:true,checked:0,transitions:[],message:'Independent direction auctions disabled; shared LIVE auction is authoritative'});
 }
 // GET is reserved for Vercel Cron and is strictly read-only unless the
 // session has been explicitly armed by the existing database start gate.
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!key||!base())return res.status(503).json({error:'Database not configured'});
 const headers={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'};
 try{
  const response=await fetch(base()+'/rest/v1/galaxy_auction_sessions?direction=in.(dubai,transfer)&select=direction,enabled,phase,current_lot_number,phase_started_at',{headers,cache:'no-store'});
  if(!response.ok)throw Error('Session read failed');
  const sessions=await response.json(),results=[];
  if(!Array.isArray(sessions))throw Error('Invalid session response');
  // Authenticated connectivity check: read-only, never calls a state-changing RPC.
  if(req.body?.dryRun===true||req.query?.dryRun==='true'){
   return res.status(200).json({dryRun:true,checked:sessions.length,sessions:sessions.map(s=>({direction:s.direction,enabled:s.enabled===true,phase:s.phase,transitionDue:nextPhase(s)!==null}))});
  }
  const errors=[];
  for(const session of sessions){
   try{
   if(session.enabled!==true&&session.phase==='waiting'){
    const start=await fetch(base()+'/rest/v1/rpc/galaxy_start_armed_direction',{method:'POST',headers,body:JSON.stringify({p_direction:session.direction})});
    if(!start.ok)throw Error('Direction start gate failed');
    appendRpcRows(results,await start.json(),session.direction);
    continue;
   }
   const transition=nextPhase(session);
   if(!transition||!Number.isSafeInteger(transition.lotNumber)||transition.lotNumber<1)continue;
   const isSold=transition.from==='sold';
   const rpc=await fetch(base()+(isSold?'/rest/v1/rpc/galaxy_advance_direction_lot':'/rest/v1/rpc/galaxy_advance_direction_phase'),{
    method:'POST',headers,body:JSON.stringify(isSold?{p_direction:transition.direction,p_expected_lot:transition.lotNumber}:{p_direction:transition.direction,p_expected_lot:transition.lotNumber,p_expected_phase:transition.from})
   });
   if(!rpc.ok)throw Error('Phase transition failed');
   appendRpcRows(results,await rpc.json(),session.direction);
   }catch(error){errors.push({direction:session.direction,error:'Direction tick failed'});}
  }
  return res.status(errors.length?503:200).json({checked:sessions.length,transitions:results,errors});
 }catch(e){return res.status(503).json({error:'Scheduler temporarily unavailable'});}
};

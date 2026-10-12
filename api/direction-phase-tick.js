'use strict';
const {nextPhase}=require('./_direction-phase-transition');
const base=()=>String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 const token=process.env.GALAXY_SCHEDULER_SECRET;
 if(!token||token.length<32)return res.status(503).json({error:'Scheduler not configured'});
 if(req.headers?.authorization!=='Bearer '+token)return res.status(401).json({error:'Unauthorized scheduler'});
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!key||!base())return res.status(503).json({error:'Database not configured'});
 const headers={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'};
 try{
  const response=await fetch(base()+'/rest/v1/galaxy_auction_sessions?direction=in.(dubai,transfer)&select=direction,enabled,phase,current_lot_number,phase_started_at',{headers,cache:'no-store'});
  if(!response.ok)throw Error('Session read failed');
  const sessions=await response.json(),results=[];
  const errors=[];
  for(const session of sessions){
   try{
   if(session.enabled!==true&&session.phase==='waiting'){
    const start=await fetch(base()+'/rest/v1/rpc/galaxy_start_armed_direction',{method:'POST',headers,body:JSON.stringify({p_direction:session.direction})});
    if(!start.ok)throw Error('Direction start gate failed');
    results.push(...(await start.json()));
    continue;
   }
   const transition=nextPhase(session);
   if(!transition||!Number.isSafeInteger(transition.lotNumber)||transition.lotNumber<1)continue;
   const isSold=transition.from==='sold';
   const rpc=await fetch(base()+(isSold?'/rest/v1/rpc/galaxy_advance_direction_lot':'/rest/v1/rpc/galaxy_advance_direction_phase'),{
    method:'POST',headers,body:JSON.stringify(isSold?{p_direction:transition.direction,p_expected_lot:transition.lotNumber}:{p_direction:transition.direction,p_expected_lot:transition.lotNumber,p_expected_phase:transition.from})
   });
   if(!rpc.ok)throw Error('Phase transition failed');
   results.push(...(await rpc.json()));
   }catch(error){errors.push({direction:session.direction,error:'Direction tick failed'});}
  }
  return res.status(errors.length?503:200).json({checked:sessions.length,transitions:results,errors});
 }catch(e){return res.status(503).json({error:'Scheduler temporarily unavailable'});}
};

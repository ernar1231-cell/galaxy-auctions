'use strict';
const {nextPhase}=require('./_direction-phase-transition');
const base=()=>String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
const key=()=>process.env.SUPABASE_SERVICE_ROLE_KEY;
async function query(path,options={}){
 const k=key();if(!k||!base())throw Error('Database unavailable');
 const response=await fetch(base()+'/rest/v1/'+path,{...options,headers:{apikey:k,Authorization:'Bearer '+k,'Content-Type':'application/json',...(options.headers||{})},cache:'no-store'});
 const data=await response.json();
 if(!response.ok)throw Error('Database operation failed');
 return data;
}
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 const authorization=String(req.headers?.authorization||'');
 const secret=process.env.CRON_SECRET;
 if(!secret||authorization!=='Bearer '+secret)return res.status(401).json({error:'Unauthorized'});
 try{
  const sessions=await query('galaxy_auction_sessions?direction=in.(dubai,transfer)&select=direction,enabled,phase,current_lot_number,phase_started_at');
  const results=[];
  for(const session of sessions){
   const proposal=nextPhase(session);
   if(!proposal){results.push({direction:session.direction,changed:false});continue;}
   const updated=await query('rpc/galaxy_advance_direction_phase',{method:'POST',body:JSON.stringify({p_direction:proposal.direction,p_expected_lot:proposal.lotNumber,p_expected_phase:proposal.from})});
   results.push({direction:session.direction,changed:updated?.[0]?.changed===true});
  }
  return res.status(200).json({results});
 }catch(e){return res.status(503).json({error:'Direction scheduler unavailable'});}
};

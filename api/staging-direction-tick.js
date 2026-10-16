'use strict';
const {databaseConfig}=require('./_direction-database-config');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(process.env.GALAXY_STAGING_MODE!=='true')return res.status(404).json({code:'STAGING_ONLY'});
 if(req.method!=='POST')return res.status(405).json({code:'METHOD_NOT_ALLOWED'});
 if(process.env.GALAXY_STAGING_SCHEDULER_ENABLED!=='true')return res.status(503).json({code:'STAGING_SCHEDULER_DISABLED'});
 const secret=process.env.GALAXY_STAGING_SCHEDULER_SECRET;
 if(!secret||secret.length<32||req.headers?.authorization!=='Bearer '+secret)return res.status(401).json({code:'UNAUTHORIZED'});
 let cfg;try{cfg=databaseConfig();}catch{return res.status(503).json({code:'STAGING_DB_NOT_CONFIGURED'});}
 const headers={apikey:cfg.key,Authorization:'Bearer '+cfg.key,'Content-Type':'application/json'};
 try{
  const response=await fetch(cfg.url+'/rest/v1/galaxy_staging_sessions?select=direction,enabled,phase,current_position',{headers,cache:'no-store'});
  if(!response.ok)throw Error('session read failed');
  const sessions=await response.json(),results=[];
  for(const s of sessions){
   if(!['dubai','transfer'].includes(s.direction)||s.enabled!==true)continue;
   const sold=s.phase==='sold';
   const rpc=sold?'galaxy_staging_finish_lot':'galaxy_staging_advance_phase';
   const body=sold?{p_direction:s.direction,p_expected_position:s.current_position}:{p_direction:s.direction,p_expected_phase:s.phase};
   const r=await fetch(cfg.url+'/rest/v1/rpc/'+rpc,{method:'POST',headers,body:JSON.stringify(body),cache:'no-store'});
   if(!r.ok)throw Error('transition failed');
   results.push({direction:s.direction,result:await r.json()});
  }
  return res.status(200).json({staging:true,results});
 }catch{return res.status(503).json({code:'STAGING_SCHEDULER_UNAVAILABLE'});}
};

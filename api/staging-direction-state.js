'use strict';
const {databaseConfig}=require('./_direction-database-config');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({code:'METHOD_NOT_ALLOWED'});
 if(process.env.GALAXY_STAGING_MODE!=='true')return res.status(404).json({code:'STAGING_ONLY'});
 let cfg;try{cfg=databaseConfig();}catch{return res.status(503).json({code:'STAGING_DB_NOT_CONFIGURED'});}
 try{
  const r=await fetch(cfg.url+'/rest/v1/galaxy_staging_sessions?select=direction,enabled,phase,current_position,current_bid,phase_started_at',{headers:{apikey:cfg.key,Authorization:'Bearer '+cfg.key},cache:'no-store'});
  if(!r.ok)throw Error('read failed');
  const rows=await r.json();return res.status(200).json({staging:true,sessions:rows.filter(x=>['dubai','transfer'].includes(x.direction))});
 }catch{return res.status(503).json({code:'STAGING_STATE_UNAVAILABLE'});}
};

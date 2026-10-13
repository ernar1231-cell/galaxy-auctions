'use strict';
const {projectSimulation}=require('./_simulation-clock');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 if(process.env.GALAXY_SIMULATION_ENABLED!=='true')return res.status(503).json({code:'SIMULATION_NOT_READY'});
 const base=String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base||!key)return res.status(503).json({code:'SIMULATION_DB_NOT_READY'});
 try{
  const direction=String(req.query?.direction||'');
  if(!['usa','dubai','transfer'].includes(direction))return res.status(400).json({error:'Invalid direction'});
  const r=await fetch(base+'/rest/v1/galaxy_sim_lots?direction=eq.'+direction+'&select=position,sim_lot_id,display_name,starting_bid,current_bid,status&order=position.asc',{
   headers:{apikey:key,Authorization:'Bearer '+key},cache:'no-store'});
  if(!r.ok)throw Error('Database error');
  const lots=await r.json();
  if(!Array.isArray(lots)||lots.length!==5)return res.status(503).json({code:'SIMULATION_INVENTORY_INCOMPLETE'});
  const clock=projectSimulation();
  return res.status(200).json({...clock,direction,lot:lots[clock.position-1],lots:lots.map(x=>({position:x.position,sim_lot_id:x.sim_lot_id,display_name:x.display_name,starting_bid:x.starting_bid}))});
 }catch{return res.status(503).json({code:'SIMULATION_UNAVAILABLE'});}
};

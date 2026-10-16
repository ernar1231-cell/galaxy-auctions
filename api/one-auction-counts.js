'use strict';
// One inventory table, three labels. No independent auction sessions.
const {publishedInDirection,DIRECTIONS}=require('./_auction-direction');
function counts(lots){
 return Object.fromEntries(DIRECTIONS.map(d=>[d,publishedInDirection(lots,d).length]));
}
module.exports=Object.assign(async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 const base=String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base||!key)return res.status(503).json({error:'Inventory unavailable'});
 try{
  const r=await fetch(base+'/rest/v1/auction_lots?select=lot_number,description,status&status=in.(upcoming,live)',{
   headers:{apikey:key,Authorization:'Bearer '+key},cache:'no-store'
  });
  if(!r.ok)throw Error('Inventory read failed');
  const lots=await r.json();
  if(!Array.isArray(lots))throw Error('Invalid inventory');
  return res.status(200).json({counts:counts(lots),total:lots.length,serverNow:new Date().toISOString(),source:'auction_lots'});
 }catch{return res.status(503).json({error:'Inventory unavailable'});}
},{counts});

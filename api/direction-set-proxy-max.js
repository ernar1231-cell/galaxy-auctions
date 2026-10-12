'use strict';
// Dubai/Transit only. Disabled by default until atomic proxy execution is integrated.
const {verifyTelegram}=require('./_direction-telegram-auth');
const {assertDirection}=require('./_multi-auction-core');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 if(process.env.GALAXY_DIRECTION_PROXY_ENABLED!=='true')
  return res.status(503).json({code:'PROXY_NOT_READY',error:'Proxy bidding not enabled'});
 let direction;
 try{direction=assertDirection(req.body?.direction)}catch{return res.status(400).json({error:'Invalid direction'});}
 if(direction==='usa')return res.status(400).json({error:'Use USA LIVE proxy API'});
 const lotNumber=Number(req.body?.lotNumber),maximum=Number(req.body?.maximum);
 if(!Number.isSafeInteger(lotNumber)||lotNumber<=0||!Number.isSafeInteger(maximum)||maximum<=0)
  return res.status(400).json({error:'Invalid proxy maximum or lot'});
 const telegramId=verifyTelegram(req.body?.initData,process.env.TELEGRAM_BOT_TOKEN);
 if(!telegramId)return res.status(401).json({error:'Telegram authentication required'});
 // Atomic competition must be explicitly enabled after the DB migration and rehearsal.
 if(process.env.GALAXY_DIRECTION_PROXY_ATOMIC_READY!=='true')
  return res.status(503).json({code:'PROXY_EXECUTION_NOT_READY',error:'Atomic proxy competition not deployed'});
 const base=String(process.env.SUPABASE_URL||'').replace(/\\/$/,'');
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base||!key)return res.status(503).json({error:'Database unavailable'});
 try{
  const response=await fetch(base+'/rest/v1/rpc/galaxy_set_direction_proxy_max',{
   method:'POST',cache:'no-store',
   headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},
   body:JSON.stringify({p_direction:direction,p_lot_number:lotNumber,p_user_telegram_id:telegramId,p_max_amount:maximum})
  });
  if(!response.ok)return res.status(409).json({error:'Proxy maximum rejected'});
  return res.status(200).json({direction,lotNumber,accepted:true});
 }catch{return res.status(503).json({error:'Proxy maximum temporarily unavailable'});}
};

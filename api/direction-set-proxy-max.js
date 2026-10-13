'use strict';
// Dubai/Transit only. Disabled by default until atomic proxy execution is integrated.
const {databaseConfig}=require('./_direction-database-config');
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
 // Only the shared atomic RPC is permitted, never the storage-only maximum RPC.
 if(process.env.GALAXY_DIRECTION_UNIFIED_BIDS_READY!=='true')
  return res.status(503).json({code:'PROXY_EXECUTION_NOT_READY',error:'Proxy competition is not yet available'});
 const {url:base,key}=databaseConfig();
 if(!base||!key)return res.status(503).json({error:'Database unavailable'});
 try{
  const response=await fetch(base+'/rest/v1/rpc/galaxy_direction_submit_bid',{
   method:'POST',cache:'no-store',
   headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},
   body:JSON.stringify({p_direction:direction,p_lot_number:lotNumber,p_user_telegram_id:telegramId,p_mode:'proxy',p_amount:maximum})
  });
  if(!response.ok)return res.status(409).json({code:'PROXY_REJECTED',error:'Proxy bid not accepted'});
  const result=await response.json(),bid=Array.isArray(result)?result[0]:null;
  if(!bid||!Number.isSafeInteger(Number(bid.event_id))||Number(bid.event_id)<=0||
   !Number.isFinite(Number(bid.new_bid))||Number(bid.new_bid)<=0)
   return res.status(503).json({code:'PROXY_CONFIRMATION_UNAVAILABLE',error:'Proxy confirmation unavailable'});
  return res.status(200).json({direction,lotNumber,bid});
 }catch{return res.status(503).json({error:'Proxy bidding temporarily unavailable'});}
};

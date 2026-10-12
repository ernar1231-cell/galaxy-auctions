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
 // Storage-only RPC does not atomically compete against manual bids or persist a winning event.
 // Never accept a financial commitment until one atomic DB operation performs all three.
 return res.status(503).json({code:'PROXY_EXECUTION_NOT_READY',error:'Proxy competition is not yet available'});
};

'use strict';
const {databaseConfig}=require('./_direction-database-config');
const {verifyTelegram}=require('./_direction-telegram-auth');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({code:'METHOD_NOT_ALLOWED'});
 if(process.env.GALAXY_STAGING_MODE!=='true')return res.status(404).json({code:'STAGING_ONLY'});
 if(process.env.GALAXY_STAGING_BIDDING_ENABLED!=='true')return res.status(503).json({code:'STAGING_BIDDING_DISABLED'});
 const {direction,position,mode,amount,initData}=req.body||{};
 if(!['dubai','transfer'].includes(direction)||!Number.isSafeInteger(position)||position<1||position>10||!['manual','proxy'].includes(mode)||!Number.isSafeInteger(amount)||amount<=0||mode==='manual'&&![100,1000].includes(amount))return res.status(400).json({code:'INVALID_BID'});
 const bidder=verifyTelegram(initData,process.env.TELEGRAM_BOT_TOKEN);
 if(!bidder)return res.status(401).json({code:'TELEGRAM_AUTH_REQUIRED'});
 let config;try{config=databaseConfig();}catch{return res.status(503).json({code:'STAGING_DB_NOT_CONFIGURED'});}
 try{
  const r=await fetch(config.url+'/rest/v1/rpc/galaxy_staging_place_bid',{method:'POST',cache:'no-store',headers:{apikey:config.key,Authorization:'Bearer '+config.key,'Content-Type':'application/json'},body:JSON.stringify({p_direction:direction,p_position:position,p_bidder_id:String(bidder),p_mode:mode,p_amount:amount})});
  if(!r.ok)return res.status(409).json({code:'STAGING_BID_REJECTED'});
  const result=await r.json();const row=Array.isArray(result)?result[0]:null;
  if(!row||!Number.isFinite(Number(row.new_bid)))return res.status(503).json({code:'CONFIRMATION_UNAVAILABLE'});
  return res.status(200).json({staging:true,nonbinding:true,direction,position,currentBid:Number(row.new_bid),eventId:row.event_id});
 }catch{return res.status(503).json({code:'STAGING_DB_UNAVAILABLE'});}
};

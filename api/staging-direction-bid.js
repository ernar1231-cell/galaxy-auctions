'use strict';
const {databaseConfig}=require('./_direction-database-config');
const {verifyTelegram}=require('./_direction-telegram-auth');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({code:'METHOD_NOT_ALLOWED'});
 if(process.env.GALAXY_STAGING_MODE!=='true')return res.status(404).json({code:'STAGING_ONLY'});
 if(process.env.GALAXY_STAGING_BIDDING_ENABLED!=='true')return res.status(503).json({code:'STAGING_BIDDING_DISABLED'});
 const {direction,lotNumber,mode,amount,initData}=req.body||{};
 if(!['dubai','transfer'].includes(direction)||!Number.isSafeInteger(lotNumber)||lotNumber<=0||!['manual','proxy'].includes(mode)||!Number.isSafeInteger(amount)||amount<=0||mode==='manual'&&![100,1000].includes(amount))return res.status(400).json({code:'INVALID_BID'});
 const bidder=verifyTelegram(initData,process.env.TELEGRAM_BOT_TOKEN);
 if(!bidder)return res.status(401).json({code:'TELEGRAM_AUTH_REQUIRED'});
 let config;try{config=databaseConfig();}catch{return res.status(503).json({code:'STAGING_DB_NOT_CONFIGURED'});}
 try{
  const mapResponse=await fetch(config.url+'/rest/v1/galaxy_staging_lot_mapping?direction=eq.'+encodeURIComponent(direction)+'&lot_number=eq.'+encodeURIComponent(String(lotNumber))+'&select=position&limit=2',{headers:{apikey:config.key,Authorization:'Bearer '+config.key},cache:'no-store'});
  if(!mapResponse.ok)return res.status(503).json({code:'STAGING_MAPPING_UNAVAILABLE'});
  const mapped=await mapResponse.json();
  if(mapped.length!==1||!Number.isSafeInteger(mapped[0].position))return res.status(409).json({code:'STAGING_LOT_NOT_MAPPED'});
  const position=mapped[0].position;
  // Production gateway verifies signed Telegram initData and returns only eligibility.
  const gateway=String(process.env.GALAXY_ACTIVE_GATEWAY_URL||'');
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/functions\/v1\/galaxy-active-eligibility$/.test(gateway))
   return res.status(503).json({code:'ACTIVE_GATEWAY_NOT_CONFIGURED'});
  const accountResponse=await fetch(gateway,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({initData}),cache:'no-store'});
  if(!accountResponse.ok)return res.status(503).json({code:'ACTIVE_SOURCE_UNAVAILABLE'});
  const account=await accountResponse.json();
  const active=account.eligible===true;
  const limit=Number(account.bidLimit||0);
  const allowed=active&&Number.isFinite(limit)&&limit>0;
  const update=await fetch(config.url+'/rest/v1/rpc/galaxy_staging_set_participant_eligibility',{method:'POST',cache:'no-store',headers:{apikey:config.key,Authorization:'Bearer '+config.key,'Content-Type':'application/json'},body:JSON.stringify({p_bidder_id:String(bidder),p_active:active,p_can_bid:allowed,p_bid_limit:Math.max(0,Number.isFinite(limit)?limit:0)})});
  if(!update.ok)return res.status(503).json({code:'ACTIVE_SYNC_UNAVAILABLE'});
  if(!allowed)return res.status(403).json({code:'ACTIVE_REQUIRED'});
  const r=await fetch(config.url+'/rest/v1/rpc/galaxy_staging_place_bid',{method:'POST',cache:'no-store',headers:{apikey:config.key,Authorization:'Bearer '+config.key,'Content-Type':'application/json'},body:JSON.stringify({p_direction:direction,p_position:position,p_bidder_id:String(bidder),p_mode:mode,p_amount:amount})});
  if(!r.ok)return res.status(409).json({code:'STAGING_BID_REJECTED'});
  const result=await r.json();const row=Array.isArray(result)?result[0]:null;
  if(!row||!Number.isFinite(Number(row.new_bid)))return res.status(503).json({code:'CONFIRMATION_UNAVAILABLE'});
  return res.status(200).json({staging:true,nonbinding:true,direction,position,currentBid:Number(row.new_bid),eventId:row.event_id});
 }catch{return res.status(503).json({code:'STAGING_DB_UNAVAILABLE'});}
};

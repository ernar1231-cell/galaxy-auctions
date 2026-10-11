'use strict';
const {verifyTelegram}=require('./_direction-telegram-auth');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 const telegramId=verifyTelegram(req.body?.initData,process.env.TELEGRAM_BOT_TOKEN);
 if(!telegramId)return res.status(401).json({error:'Telegram authorization required'});
 const direction=String(req.body?.direction||'');
 const lotNumber=Number(req.body?.lotNumber);
 if(!['dubai','transfer'].includes(direction)||!Number.isSafeInteger(lotNumber)||lotNumber<1)
  return res.status(400).json({error:'Invalid direction or lot'});
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY,base=String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
 if(!key||!base)return res.status(503).json({error:'Database unavailable'});
 const headers={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'};
 try{
  const userResponse=await fetch(base+'/rest/v1/auction_users?telegram_id=eq.'+encodeURIComponent(telegramId)+'&is_admin=eq.true&select=telegram_id',{headers,cache:'no-store'});
  if(!userResponse.ok)return res.status(503).json({error:'Admin verification unavailable'});
  const users=await userResponse.json();
  if(!Array.isArray(users)||!users.length)return res.status(403).json({error:'Admin access required'});
  const rpc=await fetch(base+'/rest/v1/rpc/galaxy_select_direction_lot',{
   method:'POST',headers,body:JSON.stringify({p_direction:direction,p_lot_number:lotNumber})
  });
  if(!rpc.ok)return res.status(409).json({error:'Cannot select lot for this auction'});
  const data=await rpc.json();
  return res.status(200).json({direction,lot:data?.[0]||null});
 }catch(e){return res.status(503).json({error:'Direction lot selection unavailable'});}
};

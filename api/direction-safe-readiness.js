'use strict';
const {verifyTelegram}=require('./_direction-telegram-auth');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 const id=verifyTelegram(req.body?.initData,process.env.TELEGRAM_BOT_TOKEN);
 if(!id)return res.status(401).json({code:'TELEGRAM_AUTH_REQUIRED'});
 const direction=String(req.body?.direction||'');
 if(!['dubai','transfer'].includes(direction))return res.status(400).json({code:'INVALID_DIRECTION'});
 const base=String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base||!key)return res.status(503).json({code:'DATABASE_UNAVAILABLE'});
 const headers={apikey:key,Authorization:'Bearer '+key};
 try{
  const [u,s,l]=await Promise.all([
   fetch(base+'/rest/v1/auction_users?telegram_id=eq.'+encodeURIComponent(id)+'&select=account_status,deposit_amount,bid_limit&limit=1',{headers,cache:'no-store'}),
   fetch(base+'/rest/v1/galaxy_auction_sessions?direction=eq.'+direction+'&select=enabled,start_armed,phase,local_start,timezone&limit=1',{headers,cache:'no-store'}),
   fetch(base+'/rest/v1/galaxy_auction_lot_assignments?direction=eq.'+direction+'&select=lot_number',{headers,cache:'no-store'})
  ]);
  if(!u.ok||!s.ok||!l.ok)throw Error('Read unavailable');
  const [users,sessions,lots]=await Promise.all([u.json(),s.json(),l.json()]);
  const account=users[0]||null,session=sessions[0]||null;
  if(!session)return res.status(503).json({code:'SESSION_NOT_FOUND'});
  const active=String(account?.account_status||'').toLowerCase()==='active';
  return res.status(200).json({
   direction,simulationOnly:true,realBiddingEnabled:false,
   participant:{active,hasDeposit:Number(account?.deposit_amount||0)>0,hasLimit:Number(account?.bid_limit||0)>0},
   session:{enabled:session.enabled===true,startArmed:session.start_armed===true,phase:session.phase,localStart:session.local_start,timezone:session.timezone},
   queuedLots:lots.length,targetLots:10,readyForTenLots:lots.length>=10
  });
 }catch{return res.status(503).json({code:'READINESS_UNAVAILABLE'});}
};

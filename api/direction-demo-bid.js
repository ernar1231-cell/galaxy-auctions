'use strict';
const {verifyTelegram}=require('./_direction-telegram-auth');
const base=()=>String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
const key=()=>process.env.SUPABASE_SERVICE_ROLE_KEY;
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(process.env.GALAXY_DUBAI_DEMO_ENABLED!=='true')
  return res.status(503).json({code:'DEMO_DISABLED'});
 const k=key();if(!k||!base())return res.status(503).json({error:'Database unavailable'});
 const direction=req.method==='GET'?(req.query?.direction||'dubai'):req.body?.direction;
 const spec=direction==='dubai'?{lot:69,table:'galaxy_demo_lot_state',rpc:'galaxy_demo_bid'}:direction==='transfer'?{lot:70,table:'galaxy_transit_demo_lot_state',rpc:'galaxy_transit_demo_bid'}:null;
 if(!spec)return res.status(400).json({error:'Invalid demo direction'});
 if(req.method==='GET'){
  try{
   const response=await fetch(base()+'/rest/v1/'+spec.table+'?direction=eq.'+direction+'&select=lot_number,current_bid,updated_at',{
    headers:{apikey:k,Authorization:'Bearer '+k},cache:'no-store'});
   if(!response.ok)throw Error('Unavailable');
   const rows=await response.json();
   if(!rows[0])return res.status(503).json({error:'Demo not initialized'});
   return res.status(200).json({demo:true,direction,lotNumber:spec.lot,currentBid:rows[0].current_bid});
  }catch{return res.status(503).json({error:'Demo unavailable'});}
 }
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 if(Number(req.body?.lotNumber)!==spec.lot)
  return res.status(400).json({error:'Wrong demo lot'});
 const id=verifyTelegram(req.body?.initData,process.env.TELEGRAM_BOT_TOKEN);
 if(!id)return res.status(401).json({error:'Telegram login required'});
 const mode=req.body?.mode,amount=Number(req.body?.amount);
 if(!['manual','proxy'].includes(mode)||!Number.isSafeInteger(amount)||amount<=0)
  return res.status(400).json({error:'Invalid demo amount'});
 try{
  const response=await fetch(base()+'/rest/v1/rpc/'+spec.rpc,{
   method:'POST',headers:{apikey:k,Authorization:'Bearer '+k,'Content-Type':'application/json'},
   body:JSON.stringify({p_user_telegram_id:id,p_mode:mode,p_amount:amount}),cache:'no-store'});
  if(!response.ok){
   const raw=await response.json().catch(()=>({}));
   const reason=String(raw?.message||raw?.code||'').slice(0,120);
   return res.status(409).json({error:'Demo bid rejected',code:reason==='Already leading'?'ALREADY_LEADING':'DEMO_BID_REJECTED'});
  }
  const price=Number(await response.json());
  if(!Number.isFinite(price))return res.status(503).json({error:'Demo confirmation unavailable'});
  return res.status(200).json({demo:true,direction,lotNumber:spec.lot,currentBid:price});
 }catch{return res.status(503).json({error:'Demo temporarily unavailable'});}
};
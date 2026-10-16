'use strict';
// One inventory table, three labels. No independent auction sessions.
const {publishedInDirection,DIRECTIONS,directionOf}=require('./_auction-direction');
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
  const headers={apikey:key,Authorization:'Bearer '+key};
  const [r,stateResponse]=await Promise.all([
   fetch(base+'/rest/v1/auction_lots?select=lot_number,description,status&status=in.(upcoming,live)',{headers,cache:'no-store'}),
   fetch(base+'/rest/v1/auction_state?id=eq.1&select=status,lot_id',{headers,cache:'no-store'})
  ]);
  if(!r.ok)throw Error('Inventory read failed');
  const lots=await r.json();
  if(!Array.isArray(lots)||!stateResponse.ok)throw Error('Invalid inventory or state');
  const state=(await stateResponse.json())?.[0];
  const activeLot=state?.status==='live'?lots.find(l=>Number(l.lot_number)===Number(state.lot_id)&&l.status==='live'):null;
  const liveDirection=activeLot?directionOf(activeLot):null;
  const {sessionStart}=require('./_one-auction-schedule');
  const now=new Date();
  const starts=Object.fromEntries(DIRECTIONS.map(d=>[d,sessionStart(d,now).toISOString()]));
  return res.status(200).json({counts:counts(lots),liveDirection,starts,total:lots.length,serverNow:now.toISOString(),source:'auction_lots'});
 }catch{return res.status(503).json({error:'Inventory unavailable'});}
},{counts});

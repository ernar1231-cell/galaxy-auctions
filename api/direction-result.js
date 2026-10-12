'use strict';
const {assertDirection}=require('./_multi-auction-core');
const base=()=>String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 let direction;
 try{direction=assertDirection(req.query?.direction);}catch{return res.status(400).json({error:'Invalid direction'});}
 if(direction==='usa')return res.status(400).json({error:'Use existing USA results API'});
 const lotNumber=Number(req.query?.lotNumber);
 if(!Number.isSafeInteger(lotNumber)||lotNumber<=0)return res.status(400).json({error:'Invalid lot'});
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!key||!base())return res.status(503).json({error:'Result unavailable'});
 const headers={apikey:key,Authorization:'Bearer '+key};
 try{
  const url=base()+'/rest/v1/galaxy_auction_results?direction=eq.'+direction+'&lot_number=eq.'+lotNumber+'&select=winning_amount,result_status&limit=1';
  const response=await fetch(url,{headers,cache:'no-store'});
  if(!response.ok)throw Error('Result query failed');
  const rows=await response.json();
  if(!Array.isArray(rows))throw Error('Invalid result');
  const item=rows[0];
  return res.status(200).json({direction,lotNumber,result:item?{amount:item.winning_amount,status:item.result_status}:null});
 }catch{return res.status(503).json({error:'Result temporarily unavailable'});}
};

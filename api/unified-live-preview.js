'use strict';
const schedule=require('./_unified-live-schedule');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 const state=schedule.resolve(new Date());
 // Only read existing direction queues. Do not touch USA LIVE or write auction state.
 if(state.displayDirection==='usa')return res.status(200).json({mode:'simulation-preview',biddingEnabled:false,automatedSwitchingEnabled:false,timeZone:'Asia/Dubai',...state,previewLot:null});
 const base=String(process.env.SUPABASE_URL||'').replace(/\\/$/,'');
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base||!key)return res.status(200).json({mode:'simulation-preview',biddingEnabled:false,automatedSwitchingEnabled:false,timeZone:'Asia/Dubai',...state,previewLot:null});
 try{
  const headers={apikey:key,Authorization:'Bearer '+key};
  const [a,b]=await Promise.all([
   fetch(base+'/rest/v1/galaxy_auction_lot_assignments?direction=eq.'+state.displayDirection+'&select=lot_number,queue_position&order=queue_position.asc',{headers}),
   fetch(base+'/rest/v1/auction_lots?status=in.(upcoming,live)&select=lot_number,make,model,year,starting_bid,auction_lot_images(image_url,is_primary,sort_order)',{headers})
  ]);
  if(!a.ok||!b.ok)throw Error('Queue unavailable');
  const assignments=await a.json(),lots=await b.json();
  const lot=(assignments||[]).map(x=>lots.find(y=>Number(y.lot_number)===Number(x.lot_number))).find(Boolean);
  const images=(lot?.auction_lot_images||[]).sort((x,y)=>(x.sort_order||0)-(y.sort_order||0));
  return res.status(200).json({mode:'simulation-preview',biddingEnabled:false,automatedSwitchingEnabled:false,timeZone:'Asia/Dubai',...state,previewLot:lot?{title:[lot.make,lot.model,lot.year].filter(Boolean).join(' '),image:(images.find(x=>x.is_primary)||images[0])?.image_url||null,startingBid:lot.starting_bid}:null});
 }catch{return res.status(200).json({mode:'simulation-preview',biddingEnabled:false,automatedSwitchingEnabled:false,timeZone:'Asia/Dubai',...state,previewLot:null});}
};

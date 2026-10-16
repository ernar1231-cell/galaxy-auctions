'use strict';
const {DIRECTIONS,directionOf}=require('./_auction-direction');
function destinationOf(lot){try{const m=String(lot.description||'').match(/\[GALAXY_DIRECTION:(\{[^\n]*\})\]/);const v=m?JSON.parse(m[1]):{};return String(v.to||'').trim().slice(0,120);}catch{return '';}}
const base=()=>String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
const key=()=>process.env.SUPABASE_SERVICE_ROLE_KEY;
async function get(path){
 const k=key();if(!k||!base())throw new Error('Database connection is not configured');
 const r=await fetch(base()+'/rest/v1/'+path,{headers:{apikey:k,Authorization:'Bearer '+k},cache:'no-store'});
 const json=await r.json();if(!r.ok)throw new Error(json?.message||'Database read failed');return json;
}
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store, max-age=0');
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 const direction=String(req.query?.direction||'');
 if(!DIRECTIONS.includes(direction))return res.status(400).json({error:'Invalid direction'});
 try{
  const lots=await get('auction_lots?status=in.(upcoming,live)&select=*,auction_lot_images(image_url,is_primary,sort_order)');
  const queue=lots.filter(l=>directionOf(l)===direction)
   .sort((a,b)=>(Number(a.sort_order)||999999)-(Number(b.sort_order)||999999)||Number(a.lot_number)-Number(b.lot_number))
   .map(l=>{
    const images=(l.auction_lot_images||[]).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
    return {id:l.id,lot_number:l.lot_number,make:l.make,model:l.model,year:l.year,status:l.status,starting_bid:l.starting_bid,mileage:l.mileage,engine:l.engine,fuel:l.fuel,transmission:l.transmission,drive:l.drive,interior_color:l.interior_color,exterior_color:l.exterior_color,vin:l.vin,destination:direction==='transfer'?destinationOf(l):'',
     images:images.map(x=>({image_url:x.image_url})),primary_image:(images.find(x=>x.is_primary)||images[0])?.image_url||null};
   });
  const {sessionStart}=require('./_one-auction-schedule');
  const {currentSlot}=require('./_one-auction-schedule');
  const slot=currentSlot(new Date());
  return res.status(200).json({direction,enabled:false,timezone:'Asia/Dubai',
   local_start:sessionStart(direction).toISOString(),phase:'waiting',
   lotCount:queue.length,firstLot:queue[0]||null,queue,unified:true});

 }catch(e){return res.status(503).json({error:'Auction data temporarily unavailable'});}
};
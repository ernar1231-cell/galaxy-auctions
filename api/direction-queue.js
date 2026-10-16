'use strict';
const {DIRECTIONS,directionOf}=require('./_auction-direction');
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
  const [sessions,assignments,lots]=await Promise.all([
   get('galaxy_auction_sessions?direction=eq.'+direction+'&select=direction,enabled,timezone,local_start,phase,current_lot_number,current_bid'),
   get('galaxy_auction_lot_assignments?direction=eq.'+direction+'&select=lot_number,queue_position&order=queue_position.asc,lot_number.asc'),
   get('auction_lots?status=in.(upcoming,live)&select=*,auction_lot_images(image_url,is_primary,sort_order)')
  ]);
  const allowed=new Map(assignments.map(x=>[Number(x.lot_number),Number(x.queue_position)]));
  const queue=lots.filter(l=>allowed.has(Number(l.lot_number))&&directionOf(l)===direction)
   .sort((a,b)=>allowed.get(Number(a.lot_number))-allowed.get(Number(b.lot_number))||Number(a.lot_number)-Number(b.lot_number))
   .map(l=>{
    const images=(l.auction_lot_images||[]).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
    return {id:l.id,lot_number:l.lot_number,make:l.make,model:l.model,year:l.year,status:l.status,starting_bid:l.starting_bid,mileage:l.mileage,engine:l.engine,fuel:l.fuel,transmission:l.transmission,drive:l.drive,interior_color:l.interior_color,exterior_color:l.exterior_color,vin:l.vin,
     images:images.map(x=>({image_url:x.image_url})),primary_image:(images.find(x=>x.is_primary)||images[0])?.image_url||null};
   });
  const session=sessions[0]||null;
  if(!session)return res.status(404).json({error:'Auction direction not configured'});
  // This endpoint is intentionally read-only. Disabled sessions cannot accept bids.
  return res.status(200).json({direction,enabled:session.enabled===true,timezone:session.timezone,local_start:session.local_start,
   phase:session.phase,lotCount:queue.length,firstLot:queue[0]||null,queue});
 }catch(e){return res.status(503).json({error:'Auction data temporarily unavailable'});}
};
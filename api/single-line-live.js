'use strict';
// Unified read-only LIVE adapter for the existing main screen.
// This endpoint never changes bidding, Buyout, HTML, or database state.
const base=()=>String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
async function read(path){
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!key||!base())throw Error('Database unavailable');
 const r=await fetch(base()+'/rest/v1/'+path,{headers:{apikey:key,Authorization:'Bearer '+key},cache:'no-store'});
 if(!r.ok)throw Error('Database read failed');
 return r.json();
}
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 if(process.env.GALAXY_SINGLE_LINE_CYCLE_ENABLED!=='true')return res.status(503).json({error:'Unified cycle disabled'});
 try{
  const cycle=(await read('galaxy_single_line_cycle?id=eq.1&select=*'))[0];
  if(!cycle)throw Error('Cycle unavailable');
  const now=new Date();
  if(cycle.phase==='break')return res.status(200).json({phase:'break',direction:null,nextDirection:cycle.next_direction,serverNow:now.toISOString(),startAt:cycle.break_ends_at,secondsRemaining:Math.max(0,Math.ceil((Date.parse(cycle.break_ends_at)-now.getTime())/1000)),lot:null});
  if(cycle.phase==='stopped')return res.status(200).json({phase:'stopped',direction:null,serverNow:now.toISOString(),lot:null});
  if(cycle.phase!=='live'||!['usa','dubai','transfer'].includes(cycle.direction))throw Error('Invalid cycle state');
  if(cycle.direction==='usa')return res.status(200).json({phase:'live',direction:'usa',serverNow:now.toISOString(),source:'/api/live-sync'});
  const [sessions,assignments,lots]=await Promise.all([
   read('galaxy_auction_sessions?direction=eq.'+cycle.direction+'&select=*'),
   read('galaxy_auction_lot_assignments?direction=eq.'+cycle.direction+'&select=lot_number,queue_position&order=queue_position.asc'),
   read('auction_lots?status=in.(upcoming,live)&select=*,auction_lot_images(image_url,is_primary,sort_order)')
  ]);
  const session=sessions[0];
  if(!session||session.enabled!==true)throw Error('Active session unavailable');
  const {directionOf}=require('./_auction-direction');
  const allowed=new Set(assignments.map(a=>Number(a.lot_number)));
  const current=lots.find(l=>Number(l.lot_number)===Number(session.current_lot_number)&&allowed.has(Number(l.lot_number))&&directionOf(l)===cycle.direction);
  if(!current)throw Error('Current lot missing');
  const images=(current.auction_lot_images||[]).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
  const {auction_lot_images,...fields}=current;
  const {phaseClock}=require('./_direction-phase-clock');
  return res.status(200).json({phase:'live',direction:cycle.direction,serverNow:now.toISOString(),sessionPhase:session.phase,phaseClock:phaseClock(session,now.getTime()),lot:{...fields,images,primary_image:(images.find(x=>x.is_primary)||images[0])?.image_url||null},currentBid:session.current_bid,biddingAvailable:false,readOnly:true});
 }catch{return res.status(503).json({error:'Unified LIVE state unavailable'});}
};

'use strict';
const {assertDirection,selectDirectionQueue,AUCTION_TIMEZONE}=require('./_multi-auction-core');
const {phaseClock}=require('./_direction-phase-clock');
const {nextPhase}=require('./_direction-phase-transition');
const base=()=>String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
const key=()=>process.env.SUPABASE_SERVICE_ROLE_KEY;
async function read(path){
 const k=key();if(!k||!base())throw new Error('Database not configured');
 const response=await fetch(base()+'/rest/v1/'+path,{headers:{apikey:k,Authorization:'Bearer '+k},cache:'no-store'});
 const data=await response.json();
 if(!response.ok)throw Error('Database query failed');
 return data;
}
// USA-style on-demand phase advancement for already-enabled Dubai/Transit sessions.
// Never arms a waiting session. Database RPC enforces expected phase/lot atomically.
async function advanceIfDue(session){
 if(process.env.GALAXY_DIRECTION_ON_DEMAND_SYNC!=='true'||session.enabled!==true)return session;
 const proposal=nextPhase(session);
 if(!proposal||!Number.isSafeInteger(proposal.lotNumber)||proposal.lotNumber<1)return session;
 const k=key(),sold=proposal.from==='sold';
 const url=base()+'/rest/v1/rpc/'+(sold?'galaxy_advance_direction_lot':'galaxy_advance_direction_phase');
 const body=sold?
  {p_direction:session.direction,p_expected_lot:proposal.lotNumber}:
  {p_direction:session.direction,p_expected_lot:proposal.lotNumber,p_expected_phase:proposal.from};
 const response=await fetch(url,{method:'POST',headers:{apikey:k,Authorization:'Bearer '+k,'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'});
 if(!response.ok)throw Error('Direction transition unavailable');
 const sessions=await read('galaxy_auction_sessions?direction=eq.'+session.direction+'&select=*');
 if(!sessions[0])throw Error('Direction session unavailable');
 return sessions[0];
}
function nextStart(now,timezone,localStart){
 const parts=String(localStart||'18:00').split(':').map(Number);
 const fmt=new Intl.DateTimeFormat('en-GB',{timeZone:timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit'});
 const fields=Object.fromEntries(fmt.formatToParts(now).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
 const target=parts[0]*60+(parts[1]||0),current=fields.hour*60+fields.minute;
 const date=new Date(Date.UTC(fields.year,fields.month-1,fields.day+(current>=target?1:0),parts[0],parts[1]||0));
 // Asia/Dubai has UTC+04:00 and no daylight saving time.
 if(timezone!==AUCTION_TIMEZONE)throw Error('Unsupported timezone');
 return new Date(date.getTime()-4*3600000).toISOString();
}
module.exports=Object.assign(async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 let direction;
 try{direction=assertDirection(req.query?.direction)}catch{return res.status(400).json({error:'Invalid direction'});}
 if(direction==='usa')return res.status(400).json({error:'Use existing USA LIVE endpoint'});
 if(process.env.GALAXY_LEGACY_DIRECTION_SESSIONS==='true'){}else{
  // Unified auction: direction is only a label and inventory filter.
  // Never advance an independent Dubai/Transit auction in a GET request.
  try{
   const {directionOf}=require('./_auction-direction');
   const {sessionStart}=require('./_one-auction-schedule');
   const [lots,states]=await Promise.all([
    read('auction_lots?status=in.(upcoming,live)&select=*,auction_lot_images(image_url,is_primary,sort_order)'),
    read('auction_state?id=eq.1&select=lot_id,status,phase,current_bid')
   ]);
   const queue=lots.filter(l=>directionOf(l)===direction).sort((a,b)=>(Number(a.sort_order)||999999)-(Number(b.sort_order)||999999)||Number(a.lot_number)-Number(b.lot_number)).map((lot,index)=>{
    const images=(lot.auction_lot_images||[]).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
    const {auction_lot_images,...fields}=lot;
    return {...fields,display_lot_number:index+1,images,primary_image:(images.find(x=>x.is_primary)||images[0])?.image_url||null};
   });
   const state=states[0];
   const current=queue.find(l=>Number(l.lot_number)===Number(state?.lot_id));
   const enabled=Boolean(current&&state?.status==='live');
   const now=new Date();
   return res.status(200).json({direction,enabled,timezone:'Asia/Dubai',startAt:sessionStart(direction,now).toISOString(),serverNow:now.toISOString(),phase:enabled?state.phase:'waiting',phaseClock:{secondsRemaining:null},lotCount:queue.length,queue,currentLot:current||queue[0]||null,currentBid:enabled?state.current_bid:null,biddingAvailable:false,proxyAvailable:false,unified:true});
  }catch{return res.status(503).json({error:'Unified direction inventory unavailable'});}
 }

 try{
  const [sessions,assignments]=await Promise.all([
   read('galaxy_auction_sessions?direction=eq.'+direction+'&select=*'),
   read('galaxy_auction_lot_assignments?direction=eq.'+direction+'&select=lot_number,direction,queue_position')
  ]);
  let session=sessions[0];if(!session)return res.status(404).json({error:'Session not configured'});
  session=await advanceIfDue(session);
  const lots=await read('auction_lots?status=in.(upcoming,live)&select=*,auction_lot_images(image_url,is_primary,sort_order)');
  const queue=selectDirectionQueue(lots,assignments,direction).map((lot,index)=>{
   const images=(lot.auction_lot_images||[]).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
   const {auction_lot_images,...fields}=lot;
   return {...fields,display_lot_number:index+1,images,primary_image:(images.find(x=>x.is_primary)||images[0])?.image_url||null};
  });
  const current=queue.find(x=>Number(x.lot_number)===Number(session.current_lot_number))||(session.enabled===true?null:queue[0]||null);
  const enabled=session.enabled===true;
  const now=new Date();
  const startAt=nextStart(now,session.timezone,session.local_start);
  const clock=phaseClock(session,now.getTime());
  const biddingAvailable=enabled&&clock.secondsRemaining!==null&&clock.secondsRemaining>0&&['red','green','bonus'].includes(String(session.phase||'').toLowerCase())&&Boolean(current)&&Number(current.lot_number)===Number(session.current_lot_number)&&String(current.status)==='live'&&process.env.GALAXY_DIRECTION_BIDDING_ENABLED==='true';
  const proxyAvailable=biddingAvailable&&process.env.GALAXY_DIRECTION_PROXY_ENABLED==='true'&&process.env.GALAXY_DIRECTION_UNIFIED_BIDS_READY==='true';
  return res.status(200).json({proxyAvailable,direction,enabled,timezone:session.timezone,local_start:session.local_start,startAt,serverNow:now.toISOString(),phase:enabled?session.phase:'waiting',phaseClock:clock,lotCount:queue.length,queue,currentLot:current,currentBid:enabled?session.current_bid:null,biddingAvailable});
 }catch(e){return res.status(503).json({error:'Auction session temporarily unavailable'});}
},{nextStart});

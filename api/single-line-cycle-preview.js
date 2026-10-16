'use strict';
// Read-only integration of the single-line cycle with existing session/lot tables.
// No UI changes, no session arming, no bids, and no database writes.
const {transition,afterBreak,DIRECTIONS}=require('./_single-line-cycle');
const {directionOf}=require('./_auction-direction');
const base=()=>String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
const key=()=>process.env.SUPABASE_SERVICE_ROLE_KEY;
async function read(path){
 const k=key();if(!base()||!k)throw Error('Database unavailable');
 const r=await fetch(base()+'/rest/v1/'+path,{headers:{apikey:k,Authorization:'Bearer '+k},cache:'no-store'});
 if(!r.ok)throw Error('Auction data unavailable');
 return r.json();
}
function remainingByDirection(lots,assignments){
 const assigned=new Map((assignments||[]).map(a=>[Number(a.lot_number),a.direction]));
 return Object.fromEntries(DIRECTIONS.map(d=>[d,(lots||[]).filter(l=>{
  const assignedDirection=assigned.get(Number(l.lot_number));
  return (assignedDirection||directionOf(l))===d&&directionOf(l)===d&&['upcoming','live'].includes(String(l.status).toLowerCase());
 }).length]));
}
function snapshot({direction,remaining,finishedAt,now,breakStartsAt}){
 const result=transition({direction,remainingLots:remaining[direction],finishedAt});
 if(result.phase!=='break')return result;
 const startsAt=breakStartsAt||result.startsAt;
 return afterBreak({nextDirection:result.nextDirection,startsAt,now,remainingLots:remaining[result.nextDirection]});
}
module.exports=Object.assign(async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 // Explicit preview only: the live app must not infer authorization to switch auctions.
 const direction=String(req.query?.direction||'');
 if(!DIRECTIONS.includes(direction))return res.status(400).json({error:'Invalid direction'});
 try{
  const [lots,assignments,cycles]=await Promise.all([
   read('auction_lots?status=in.(upcoming,live)&select=lot_number,status,description'),
   read('galaxy_auction_lot_assignments?select=lot_number,direction'),
   read('galaxy_single_line_cycle?id=eq.1&select=phase,direction,next_direction,break_started_at,break_ends_at,completed_at')
  ]);
  const remaining=remainingByDirection(lots,assignments);
  // A completion timestamp must be persisted by an authoritative auction scheduler.
  // Without it, never invent the one-hour countdown or start another direction.
  const cycle=cycles[0];
  if(!cycle)throw Error('Cycle state missing');
  const now=Date.now();
  const result=cycle.phase==='break'?{phase:'break',nextDirection:cycle.next_direction,startsAt:cycle.break_ends_at,secondsRemaining:Math.max(0,Math.ceil((Date.parse(cycle.break_ends_at)-now)/1000))}:cycle.phase==='live'?{phase:'live',direction:cycle.direction}:{phase:'stopped',direction:null};
  return res.status(200).json({mode:'read-only-preview',automatedSwitchingEnabled:false,remaining,result});
 }catch{return res.status(503).json({error:'Auction cycle preview unavailable'});}
},{remainingByDirection,snapshot});

'use strict';
const {DIRECTIONS,directionOf}=require('./_auction-direction');
const SESSION_TABLE='galaxy_auction_sessions';
const ASSIGNMENT_TABLE='galaxy_auction_lot_assignments';
const BID_EVENT_TABLE='galaxy_auction_bid_events';
const AUCTION_TIMEZONE='Asia/Dubai';
function assertDirection(value){
 const direction=String(value||'');
 if(!DIRECTIONS.includes(direction))throw new Error('Invalid auction direction');
 return direction;
}
function belongsToDirection(lot,direction){
 return directionOf(lot)===assertDirection(direction);
}
function selectDirectionQueue(lots,assignments,direction){
 const d=assertDirection(direction);
 const positions=new Map((assignments||[]).filter(a=>a.direction===d).map(a=>[Number(a.lot_number),Number(a.queue_position)]));
 return (lots||[]).filter(l=>positions.has(Number(l.lot_number))&&belongsToDirection(l,d)&&['upcoming','live'].includes(String(l.status).toLowerCase()))
  .sort((a,b)=>positions.get(Number(a.lot_number))-positions.get(Number(b.lot_number))||Number(a.lot_number)-Number(b.lot_number));
}
function sessionCanBid(session,lotNumber){
 return Boolean(session&&session.enabled===true&&session.phase!=='waiting'&&session.phase!=='sold'&&Number(session.current_lot_number)===Number(lotNumber));
}
module.exports={DIRECTIONS,SESSION_TABLE,ASSIGNMENT_TABLE,BID_EVENT_TABLE,AUCTION_TIMEZONE,assertDirection,belongsToDirection,selectDirectionQueue,sessionCanBid};

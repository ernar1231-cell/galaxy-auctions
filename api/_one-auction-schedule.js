'use strict';
// One existing auction engine; directions are lot categories, not bid sessions.
const {directionOf}=require('./_auction-direction');
const ORDER=Object.freeze(['usa','dubai','transfer']);
const START_HOURS=Object.freeze({usa:13,dubai:17,transfer:21});
const DUBAI_UTC_OFFSET_HOURS=4;
function dubaiDayStart(value){
 const date=new Date(value);
 if(!Number.isFinite(date.getTime()))throw new TypeError('Invalid time');
 const local=new Date(date.getTime()+DUBAI_UTC_OFFSET_HOURS*3600000);
 return Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate())-DUBAI_UTC_OFFSET_HOURS*3600000;
}
function sessionStart(direction,now=new Date()){
 if(!ORDER.includes(direction))throw new Error('Invalid direction');
 return new Date(dubaiDayStart(now)+START_HOURS[direction]*3600000);
}
function currentSlot(now=new Date()){
 const ms=new Date(now).getTime();
 if(!Number.isFinite(ms))throw new TypeError('Invalid time');
 const day=dubaiDayStart(ms);
 const starts=ORDER.map(direction=>({direction,startAt:new Date(day+START_HOURS[direction]*3600000)}));
 const current=[...starts].reverse().find(x=>ms>=x.startAt.getTime());
 return current||{direction:null,startAt:starts[0].startAt,nextDirection:'usa'};
}
function nextSlot(now=new Date()){
 const ms=new Date(now).getTime(),day=dubaiDayStart(ms);
 for(const direction of ORDER){
  const at=day+START_HOURS[direction]*3600000;
  if(ms<at)return {direction,startAt:new Date(at)};
 }
 return {direction:'usa',startAt:new Date(day+86400000+START_HOURS.usa*3600000)};
}
function directionQueue(lots,direction){
 if(!ORDER.includes(direction))throw new Error('Invalid direction');
 return (lots||[]).filter(l=>['upcoming','live'].includes(String(l.status||'').toLowerCase())&&directionOf(l)===direction)
 .sort((a,b)=>(Number(a.sort_order)||999999)-(Number(b.sort_order)||999999)||Number(a.lot_number)-Number(b.lot_number));
}
module.exports={ORDER,START_HOURS,sessionStart,currentSlot,nextSlot,directionQueue};

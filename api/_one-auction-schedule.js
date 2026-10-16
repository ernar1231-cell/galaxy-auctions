'use strict';
// One existing auction engine; directions are lot categories, not bid sessions.
const {directionOf}=require('./_auction-direction');
const ORDER=Object.freeze(['usa','dubai','transfer']);
const START_HOURS=Object.freeze({usa:13,dubai:17,transfer:21});
const DUBAI_UTC_OFFSET_HOURS=4;
// One-day meeting schedule; automatically expires after 2026-10-16 Dubai time.
const DEMO_DAY='2026-10-16';
const DEMO_MINUTES=Object.freeze({usa:21*60+30,dubai:21*60+40,transfer:21*60+50});
function scheduleMinutes(day){
 const local=new Date(day+4*3600000);
 const ymd=local.toISOString().slice(0,10);
 return ymd===DEMO_DAY?DEMO_MINUTES:{usa:780,dubai:1020,transfer:1260};
}
function dubaiDayStart(value){
 const date=new Date(value);
 if(!Number.isFinite(date.getTime()))throw new TypeError('Invalid time');
 const local=new Date(date.getTime()+DUBAI_UTC_OFFSET_HOURS*3600000);
 return Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate())-DUBAI_UTC_OFFSET_HOURS*3600000;
}
function sessionStart(direction,now=new Date()){
 if(!ORDER.includes(direction))throw new Error('Invalid direction');
 const day=dubaiDayStart(now);
 return new Date(day+scheduleMinutes(day)[direction]*60000);
}
function currentSlot(now=new Date()){
 const ms=new Date(now).getTime();
 if(!Number.isFinite(ms))throw new TypeError('Invalid time');
 const day=dubaiDayStart(ms);
 const minutes=scheduleMinutes(day);
 const starts=ORDER.map(direction=>({direction,startAt:new Date(day+minutes[direction]*60000)}));
 const current=[...starts].reverse().find(x=>ms>=x.startAt.getTime());
 return current||{direction:null,startAt:starts[0].startAt,nextDirection:'usa'};
}
function nextSlot(now=new Date()){
 const ms=new Date(now).getTime(),day=dubaiDayStart(ms);
 const minutes=scheduleMinutes(day);
 for(const direction of ORDER){
  const at=day+minutes[direction]*60000;
  if(ms<at)return {direction,startAt:new Date(at)};
 }
 return {direction:'usa',startAt:new Date(day+86400000+scheduleMinutes(day+86400000).usa*60000)};
}
function directionQueue(lots,direction){
 if(!ORDER.includes(direction))throw new Error('Invalid direction');
 return (lots||[]).filter(l=>['upcoming','live'].includes(String(l.status||'').toLowerCase())&&directionOf(l)===direction)
 .sort((a,b)=>(Number(a.sort_order)||999999)-(Number(b.sort_order)||999999)||Number(a.lot_number)-Number(b.lot_number));
}
module.exports={ORDER,START_HOURS,sessionStart,currentSlot,nextSlot,directionQueue,scheduleMinutes,DEMO_DAY};

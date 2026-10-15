'use strict';
// Staging-only deterministic schedule plan. No writes, no bidding or production hooks.
const WINDOWS=Object.freeze([
 Object.freeze({direction:'usa',startHour:13,endHour:17,firstLot:1,lastLot:100}),
 Object.freeze({direction:'dubai',startHour:17,endHour:21,firstLot:101,lastLot:200}),
 Object.freeze({direction:'transfer',startHour:21,endHour:1,firstLot:201,lastLot:300})
]);
function directionForLot(number){
 const n=Number(number);
 if(!Number.isInteger(n)||n<1||n>300)return null;
 return WINDOWS.find(w=>n>=w.firstLot&&n<=w.lastLot).direction;
}
function directionAtDubaiTime(value){
 const date=value instanceof Date?value:new Date(value);
 if(!Number.isFinite(date.getTime()))throw new TypeError('Invalid date');
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Dubai',hour:'2-digit',hourCycle:'h23'}).formatToParts(date);
 const hour=Number(parts.find(p=>p.type==='hour').value);
 if(hour>=13&&hour<17)return 'usa';
 if(hour>=17&&hour<21)return 'dubai';
 if(hour>=21||hour<1)return 'transfer';
 return null;
}
// Schedule eligibility is NOT auction activation. Server must verify final lot closure,
// valid session state and bidding authorization before advancing the live queue.
function mayAdvance({currentDirection,completedLot,serverConfirmedClosed}){
 if(!serverConfirmedClosed)return false;
 const window=WINDOWS.find(w=>w.direction===currentDirection);
 return Boolean(window&&Number(completedLot)===window.lastLot);
}
module.exports={WINDOWS,directionForLot,directionAtDubaiTime,mayAdvance};

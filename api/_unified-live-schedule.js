'use strict';
const SLOTS=[{direction:'usa',start:13,end:16,next:'dubai'},{direction:'dubai',start:17,end:20,next:'transfer'},{direction:'transfer',start:21,end:24,next:'usa'}];
function resolve(now=new Date()){
 const d=now instanceof Date?now:new Date(now);
 if(!Number.isFinite(d.getTime()))throw new TypeError('Invalid time');
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Dubai',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(d).filter(x=>x.type!=='literal').map(x=>[x.type,Number(x.value)]));
 const second=parts.hour*3600+parts.minute*60+parts.second;
 for(const slot of SLOTS)if(second>=slot.start*3600&&second<slot.end*3600)return {phase:'live',direction:slot.direction,displayDirection:slot.direction,upNext:slot.next,secondsRemaining:slot.end*3600-second};
 const next=SLOTS.find(x=>second<x.start*3600)||SLOTS[0];
 return {phase:'waiting',direction:null,displayDirection:next.direction,upNext:next.direction,secondsRemaining:((next.start*3600-second)+86400)%86400};
}
// Next direction to display after the current auction is exhausted.
// The next auction never starts early; only its catalog preview may appear.
function afterCompleted(direction,now=new Date()){
 const current=SLOTS.find(x=>x.direction===direction);
 if(!current)throw new TypeError('Invalid direction');
 const next=SLOTS.find(x=>x.direction===current.next);
 const d=now instanceof Date?now:new Date(now);
 if(!Number.isFinite(d.getTime()))throw new TypeError('Invalid time');
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Dubai',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(d).filter(x=>x.type!=='literal').map(x=>[x.type,Number(x.value)]));
 const second=parts.hour*3600+parts.minute*60+parts.second;
 const delta=(next.start*3600-second+86400)%86400;
 return {phase:'waiting',direction:null,displayDirection:next.direction,upNext:next.direction,secondsRemaining:delta};
}
module.exports={SLOTS,resolve,afterCompleted};

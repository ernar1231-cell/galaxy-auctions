'use strict';
// Single-line auction order. This module is pure: no UI, database writes or bids.
// The caller supplies the authoritative count of unfinished lots in each direction.
const DIRECTIONS=Object.freeze(['usa','dubai','transfer']);
const BREAK_MS=60*60*1000;
function transition({direction,remainingLots,finishedAt}){
 const index=DIRECTIONS.indexOf(direction);
 if(index<0)throw new Error('Invalid direction');
 if(!Number.isSafeInteger(remainingLots)||remainingLots<0)throw new Error('Invalid remaining lot count');
 if(remainingLots>0)return {phase:'live',direction};
 if(index===DIRECTIONS.length-1)return {phase:'stopped',direction:null,nextDirection:null};
 const timestamp=new Date(finishedAt).getTime();
 if(!Number.isFinite(timestamp))throw new Error('Invalid finish time');
 return {phase:'break',direction:null,nextDirection:DIRECTIONS[index+1],startsAt:new Date(timestamp+BREAK_MS).toISOString()};
}
function afterBreak({nextDirection,startsAt,now,remainingLots}){
 if(!DIRECTIONS.includes(nextDirection))throw new Error('Invalid next direction');
 if(!Number.isSafeInteger(remainingLots)||remainingLots<0)throw new Error('Invalid remaining lot count');
 const start=new Date(startsAt).getTime(),current=new Date(now).getTime();
 if(!Number.isFinite(start)||!Number.isFinite(current))throw new Error('Invalid time');
 if(current<start)return {phase:'break',direction:null,nextDirection,startsAt:new Date(start).toISOString()};
 return remainingLots>0?{phase:'live',direction:nextDirection}:{phase:'empty',direction:nextDirection};
}
module.exports={DIRECTIONS,BREAK_MS,transition,afterBreak};

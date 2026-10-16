'use strict';
// Shared fail-closed authorization for bids on the single active auction.
async function requireActiveDirection(direction,base,key){
 if(process.env.GALAXY_SINGLE_LINE_CYCLE_ENABLED!=='true')return;
 if(!base||!key)throw Error('Cycle database unavailable');
 const response=await fetch(base.replace(/\/$/,'')+'/rest/v1/galaxy_single_line_cycle?id=eq.1&select=phase,direction',{
  headers:{apikey:key,Authorization:'Bearer '+key},cache:'no-store'
 });
 if(!response.ok)throw Error('Cycle authorization unavailable');
 const cycle=(await response.json())?.[0];
 if(!cycle||cycle.phase!=='live'||cycle.direction!==direction)throw Error('Direction is not active');
}
module.exports={requireActiveDirection};

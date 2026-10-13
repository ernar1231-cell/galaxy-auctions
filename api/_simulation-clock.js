'use strict';
// Deterministic read-only projection. Does not arm sessions, place bids or create SOLD.
const CYCLE_MS=10*60*1000,LOT_MS=CYCLE_MS/5;
function projectSimulation(now=Date.now()){
 if(!Number.isFinite(now)||now<0)throw Error('Invalid server time');
 const cycleStart=Math.floor(now/CYCLE_MS)*CYCLE_MS;
 const elapsed=now-cycleStart;
 const position=Math.floor(elapsed/LOT_MS)+1;
 const within=elapsed%LOT_MS;
 const phase=within<60000?'red':within<90000?'green':within<110000?'bonus':'sold';
 const phaseEndsAt=cycleStart+(position-1)*LOT_MS+
  (phase==='red'?60000:phase==='green'?90000:phase==='bonus'?110000:120000);
 return {simulation:true,cycleStart:new Date(cycleStart).toISOString(),cycleEndsAt:new Date(cycleStart+CYCLE_MS).toISOString(),position,phase,phaseEndsAt:new Date(phaseEndsAt).toISOString(),secondsRemaining:Math.max(0,Math.ceil((phaseEndsAt-now)/1000))};
}
module.exports={projectSimulation,CYCLE_MS,LOT_MS};

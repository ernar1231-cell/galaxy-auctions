'use strict';
const {phaseClock}=require('./_direction-phase-clock');
// Pure, deterministic proposal. A trusted scheduler must apply transitions atomically.
function nextPhase(session,nowMs=Date.now()){
 const clock=phaseClock(session,nowMs);
 if(!session||session.enabled!==true||clock.secondsRemaining===null||clock.secondsRemaining>0)return null;
 const phase=String(session.phase||'').toLowerCase();
 if(phase==='red')return {from:phase,to:'green',direction:session.direction,lotNumber:Number(session.current_lot_number)};
 if(phase==='green')return {from:phase,to:'bonus',direction:session.direction,lotNumber:Number(session.current_lot_number)};
 if(phase==='bonus')return {from:phase,to:'sold',direction:session.direction,lotNumber:Number(session.current_lot_number)};
 if(phase==='sold')return {from:phase,to:'waiting',direction:session.direction,lotNumber:Number(session.current_lot_number)};
 return null;
}
module.exports={nextPhase};

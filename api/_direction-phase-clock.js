'use strict';
// Pure state derivation: no writes, no implicit session activation.
const DURATIONS=Object.freeze({green:15,red:15,bonus:15,sold:2});
function phaseClock(session,nowMs=Date.now()){
 if(!session||session.enabled!==true)return {phase:'waiting',secondsRemaining:null,serverControlled:true};
 const phase=String(session.phase||'waiting').toLowerCase();
 if(!Object.prototype.hasOwnProperty.call(DURATIONS,phase))return {phase,secondsRemaining:null,serverControlled:true};
 const start=Date.parse(session.phase_started_at||'');
 if(!Number.isFinite(start))return {phase,secondsRemaining:null,serverControlled:true};
 const elapsed=Math.max(0,(nowMs-start)/1000);
 return {phase,secondsRemaining:Math.max(0,Math.ceil(DURATIONS[phase]-elapsed)),serverControlled:true};
}
module.exports={phaseClock,DURATIONS};

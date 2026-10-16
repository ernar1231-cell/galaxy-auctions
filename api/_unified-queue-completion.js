'use strict';
// Conservative read-only detection: a direction is complete only when it had
// assigned lots, no pending/live lots remain, and all lots have final statuses.
// Never treats an empty queue as sold.
const FINAL=new Set(['sold','pending','unsold','passed','no_sale']);
function completion(assignments,lots){
 const numbers=new Set((assignments||[]).map(a=>Number(a.lot_number)).filter(Number.isSafeInteger));
 if(!numbers.size)return {complete:false,reason:'NO_ASSIGNED_LOTS'};
 const byNumber=new Map((lots||[]).map(l=>[Number(l.lot_number),String(l.status||'').toLowerCase()]));
 let finished=0;
 for(const n of numbers){
  const status=byNumber.get(n);
  if(!status)return {complete:false,reason:'MISSING_LOT'};
  if(!FINAL.has(status))return {complete:false,reason:'UNFINISHED_LOT'};
  finished++;
 }
 return {complete:true,finished,reason:'ALL_LOTS_FINAL'};
}
module.exports={completion};

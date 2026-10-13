(function(){
'use strict';
let direction='usa',seq=0,lastKey='';
const labels={usa:'USA',dubai:'Dubai',transfer:'Transit'};
const $=id=>document.getElementById(id);
const money=v=>'$'+Number(v).toLocaleString('en-US');
function choose(d){
 if(!Object.prototype.hasOwnProperty.call(labels,d))return;
 direction=d;seq++;lastKey='';$('directionName').textContent=labels[d];
 document.querySelectorAll('[data-direction]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.direction===d)));
 $('vehicle').textContent='Подключение…';$('timer').textContent='--:--';
 void refresh();
}
async function refresh(){
 const mySeq=seq,d=direction;
 try{
  const response=await fetch('/api/simulation-state?direction='+encodeURIComponent(d),{cache:'no-store'});
  const data=await response.json();
  if(mySeq!==seq||d!==direction)return;
  if(!response.ok)throw Error(data.code||'SIMULATION_UNAVAILABLE');
  if(data.simulation!==true||data.direction!==d||!Number.isInteger(data.position)||data.position<1||data.position>5||data.lot?.position!==data.position)throw Error('INVALID_SIMULATION_STATE');
  const key=d+':'+data.cycleStart+':'+data.position;
  if(key!==lastKey)lastKey=key;
  $('session').textContent='Цикл: '+new Date(data.cycleStart).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Dubai'})+' (Дубай)';
  $('position').textContent='Лот '+data.position+' из 5';
  $('vehicle').textContent=data.lot.display_name;
  $('lotNumber').textContent=data.lot.sim_lot_id;
  $('phase').textContent=data.phase.toUpperCase()+' · СИМУЛЯЦИЯ';
  $('price').textContent=money(data.lot.starting_bid);
  const ms=Math.max(0,Date.parse(data.phaseEndsAt)-Date.now());
  const seconds=Math.ceil(ms/1000);
  $('timer').textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
  $('notice').textContent='Отдельный симуляционный контур. Цикл каждые 20 минут, 5 условных лотов. Ставки и SOLD отключены до отдельной проверки.';
 }catch(err){
  if(mySeq!==seq)return;
  $('phase').textContent='Ожидание запуска';
  $('notice').textContent='Симуляция пока не включена: '+String(err.message||err)+'. Настоящие ставки недоступны.';
 }
}
document.querySelectorAll('[data-direction]').forEach(b=>b.addEventListener('click',()=>choose(b.dataset.direction)));
void refresh();
setInterval(refresh,1000);
})();
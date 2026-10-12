(function(){
'use strict';
// Isolated read-only Dubai/Transit screen refresh; never modifies USA LIVE.
const screen=()=>document.getElementById('directionCatalogScreen');
let direction=null,lot=null,generation=0,busy=false,previousPhase='',previousLot=null;
let bidAllowed=false,proxyAllowed=false,increment=100,bidBusy=false;
let phaseDeadline=0,phaseName='waiting',clockSkewMs=0;
let completedLot=null;
const money=v=>Number.isFinite(Number(v))?'$'+Number(v).toLocaleString('en-US'):'—';
async function read(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('Unavailable');return r.json();}
function area(panel,id){let el=panel.querySelector('#'+id);if(!el){el=document.createElement('section');el.id=id;el.className='directionLiveNotice';panel.querySelector('#directionCatalogItems')?.appendChild(el);}return el;}
async function history(panel,d,lotNumber,token){
 const data=await read('/api/direction-bid-history?direction='+encodeURIComponent(d)+'&lotNumber='+lotNumber);
 if(token!==generation||lot!==lotNumber||!panel.classList.contains('open'))return;
 const box=area(panel,'directionPublicHistory');if(!box)return;
 box.replaceChildren();const heading=document.createElement('strong');heading.textContent='История ставок';box.appendChild(heading);
 const events=Array.isArray(data.events)?data.events:[];
 if(!events.length){const p=document.createElement('p');p.textContent='Ставок пока нет';box.appendChild(p);return;}
 const list=document.createElement('ol');
 for(const event of events.slice(0,10)){const li=document.createElement('li');li.textContent=money(event.amount);list.appendChild(li);}
 box.appendChild(list);
}
async function result(panel,d,lotNumber,token){
 const data=await read('/api/direction-result?direction='+encodeURIComponent(d)+'&lotNumber='+lotNumber);
 if(token!==generation||!panel.classList.contains('open'))return;
 const box=area(panel,'directionPublicResult');if(!box)return;
 box.replaceChildren();
 const heading=document.createElement('strong');heading.textContent='SOLD — результат';box.appendChild(heading);
 const p=document.createElement('p');p.textContent=data.result?'Цена: '+money(data.result.amount)+' · Статус: '+String(data.result.status||'ожидает подтверждения'):'Результат пока не подтверждён';box.appendChild(p);
}
async function refresh(){
 const panel=screen();if(!panel||!panel.classList.contains('open')||!direction||busy)return;
 busy=true;const token=generation,d=direction;
 try{
  const state=await read('/api/direction-live-state?direction='+encodeURIComponent(d)+'&t='+Date.now());
  if(token!==generation||!panel.classList.contains('open'))return;
  const lotNumber=state.currentLot?Number(state.currentLot.lot_number):null;
  if(lotNumber!==null&&lotNumber!==lot){
   panel.querySelector('#directionPublicHistory')?.remove();
   panel.querySelector('#directionPublicResult')?.remove();
   lot=lotNumber;
   panel.dispatchEvent(new CustomEvent('galaxy-direction-current-lot',{detail:{lotNumber}}));
  }
  const remaining=Number(state.phaseClock?.secondsRemaining);
  phaseName=String(state.phase||'waiting').toLowerCase();
  clockSkewMs=Number.isFinite(Date.parse(state.serverNow))?Date.parse(state.serverNow)-Date.now():0;
  phaseDeadline=state.enabled&&state.phaseClock?.secondsRemaining!=null&&Number.isFinite(remaining)?Date.now()+Math.max(0,remaining)*1000:0;
  const status=panel.querySelector('.directionLiveStatus span');
  if(status)status.textContent=state.enabled===true?'● LIVE AUCTION · '+phaseName.toUpperCase():'○ АУКЦИОН ОЖИДАЕТ ЗАПУСКА';
  const label=panel.querySelector('#directionPhaseLabel');
  if(label)label.textContent=state.enabled?'Фаза: '+String(state.phase||'waiting'):'Ожидаем начало аукциона';
  const price=panel.querySelector('#directionCurrentBid');
  if(price)price.textContent=state.enabled&&state.currentBid!=null?'Текущая ставка '+money(state.currentBid):'Ставки пока недоступны';
  bidAllowed=state.biddingAvailable===true&&lotNumber!==null&&state.enabled===true&&phaseDeadline>Date.now()&&Number(panel.dataset.visibleLotNumber)===lotNumber;
  for(const id of ['directionBidMinus','directionBidPlus','directionBidSubmit']){
   const button=panel.querySelector('#'+id);
   if(button)button.disabled=!bidAllowed||bidBusy;
  }
  proxyAllowed=bidAllowed&&state.proxyAvailable===true;
  const proxyInput=panel.querySelector('#directionProxyMaximum');
  const proxySubmit=panel.querySelector('#directionProxySubmit');
  if(proxyInput)proxyInput.disabled=!proxyAllowed||bidBusy;
  if(proxySubmit)proxySubmit.disabled=!proxyAllowed||bidBusy;
  const amount=panel.querySelector('#directionBidAmount');
  if(amount)amount.textContent=bidAllowed?'Шаг ставки '+money(increment):'Ставки пока недоступны';
  const phase=String(state.phase||'waiting').toLowerCase();
  if(previousPhase==='sold'&&phase!=='sold'&&previousLot!==null){
   completedLot=previousLot;
  }
  if(previousPhase&&previousPhase!==phase){
   panel.dispatchEvent(new CustomEvent('galaxy-direction-phase-change',{detail:{direction:d,phase,lotNumber}}));
  }
  previousPhase=phase;previousLot=lotNumber;
  if(lotNumber!==null)await history(panel,d,lotNumber,token).catch(()=>{});
  if(phase==='sold'&&lotNumber!==null)await result(panel,d,lotNumber,token).catch(()=>{});
  else if(completedLot!==null&&completedLot===lotNumber)await result(panel,d,completedLot,token).catch(()=>{});
 }catch(error){console.warn('Direction refresh unavailable',error);}
 finally{busy=false;}
}
document.addEventListener('click',event=>{
 const card=event.target.closest('#auctionDirectionDubai,#auctionDirectionTransfer');
 if(card){direction=card.id==='auctionDirectionDubai'?'dubai':'transfer';lot=null;completedLot=null;bidAllowed=false;proxyAllowed=false;increment=100;previousLot=null;previousPhase='';generation++;}
 if(event.target.closest('#modernBottomNav,#directionCatalogBack')){direction=null;lot=null;completedLot=null;bidAllowed=false;proxyAllowed=false;previousLot=null;previousPhase='';generation++;}
});
const increments=[100,1000,10000];
document.addEventListener('click',async event=>{
 const button=event.target.closest('#directionBidMinus,#directionBidPlus,#directionBidSubmit');
 if(!button||!screen()?.classList.contains('open')||!bidAllowed||bidBusy||!direction||!lot||Number(screen().dataset.visibleLotNumber)!==lot)return;
 if(button.id!=='directionBidSubmit'){
  const index=increments.indexOf(increment);
  increment=increments[Math.max(0,Math.min(increments.length-1,index+(button.id==='directionBidPlus'?1:-1)))];
  const amount=screen()?.querySelector('#directionBidAmount');
  if(amount)amount.textContent='Шаг ставки '+money(increment);
  return;
 }
 const initData=window.Telegram?.WebApp?.initData;
 if(!initData){window.alert('Для ставки откройте аукцион через Telegram.');return;}
 const d=direction,lotNumber=lot,token=generation;
 bidBusy=true;
 for(const id of ['directionBidMinus','directionBidPlus','directionBidSubmit']){
  const control=screen()?.querySelector('#'+id);if(control)control.disabled=true;
 }
 try{
  const response=await fetch('/api/direction-place-bid',{
   method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',
   body:JSON.stringify({direction:d,lotNumber,increment,initData})
  });
  const result=await response.json();
  if(!response.ok||!result.bid)throw Error('Ставка не принята сервером');
  if(token===generation&&direction===d&&lot===lotNumber){
   const amount=screen()?.querySelector('#directionBidAmount');
   if(amount)amount.textContent='Ставка принята: '+money(result.bid.new_bid);
  }
 }catch(error){if(token===generation)window.alert(error.message||'Ошибка ставки');}
 finally{bidBusy=false;bidAllowed=false;refresh();}
});
document.addEventListener('click',async event=>{
 if(!event.target.closest('#directionProxySubmit'))return;
 const panel=screen();
 if(!panel?.classList.contains('open')||!direction||!lot||!proxyAllowed||bidBusy||
    Number(panel.dataset.visibleLotNumber)!==lot)return;
 const maximum=Number(panel.querySelector('#directionProxyMaximum')?.value);
 if(!Number.isSafeInteger(maximum)||maximum<=0){window.alert('Введите корректную максимальную сумму.');return;}
 const initData=window.Telegram?.WebApp?.initData;
 if(!initData){window.alert('Откройте аукцион через Telegram.');return;}
 const d=direction,lotNumber=lot,token=generation;
 bidBusy=true;proxyAllowed=false;
 const control=panel.querySelector('#directionProxySubmit');
 if(control)control.disabled=true;
 try{
  const response=await fetch('/api/direction-set-proxy-max',{
   method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',
   body:JSON.stringify({direction:d,lotNumber,maximum,initData})
  });
  const data=await response.json();
  if(!response.ok||!data.bid)throw Error('Максимальная ставка не принята сервером');
  if(token===generation&&direction===d&&lot===lotNumber)
   window.alert('Максимальная ставка принята. Текущая цена: '+money(data.bid.new_bid));
 }catch(error){if(token===generation)window.alert(error.message||'Ошибка proxy-ставки');}
 finally{bidBusy=false;refresh();}
});
setInterval(()=>{
 const panel=screen();if(!panel?.classList.contains('open')||!direction||!phaseDeadline)return;
 const remaining=Math.max(0,Math.ceil((phaseDeadline-Date.now())/1000));
 const clock=panel.querySelector('#directionLiveCountdown');
 if(clock)clock.textContent=phaseName.toUpperCase()+' '+String(remaining).padStart(2,'0')+'с';
 if(remaining===0){
  bidAllowed=false;proxyAllowed=false;
  const proxyInput=panel.querySelector('#directionProxyMaximum');
  const proxySubmit=panel.querySelector('#directionProxySubmit');
  if(proxyInput)proxyInput.disabled=true;
  if(proxySubmit)proxySubmit.disabled=true;
  for(const id of ['directionBidMinus','directionBidPlus','directionBidSubmit']){
   const button=panel.querySelector('#'+id);if(button)button.disabled=true;
  }
 }
},250);
setInterval(refresh,3000);
})();

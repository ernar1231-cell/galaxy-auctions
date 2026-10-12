(function(){
'use strict';
// Isolated read-only Dubai/Transit screen refresh; never modifies USA LIVE.
const screen=()=>document.getElementById('directionCatalogScreen');
let direction=null,lot=null,generation=0,busy=false,previousPhase='',previousLot=null;
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
   lot=lotNumber;
   panel.dispatchEvent(new CustomEvent('galaxy-direction-current-lot',{detail:{lotNumber}}));
  }
  const label=panel.querySelector('#directionPhaseLabel');
  if(label)label.textContent=state.enabled?'Фаза: '+String(state.phase||'waiting'):'Ожидаем начало аукциона';
  const price=panel.querySelector('#directionCurrentBid');
  if(price)price.textContent=state.enabled&&state.currentBid!=null?'Текущая ставка '+money(state.currentBid):'Ставки пока недоступны';
  for(const id of ['directionBidMinus','directionBidPlus','directionBidSubmit']){
   const button=panel.querySelector('#'+id);
   // Catalog buttons have no verified submit handlers yet: keep them disabled.
   if(button)button.disabled=true;
  }
  const phase=String(state.phase||'waiting').toLowerCase();
  if(previousPhase==='sold'&&phase!=='sold'&&previousLot!==null){
   await result(panel,d,previousLot,token).catch(()=>{});
  }
  if(previousPhase&&previousPhase!==phase){
   panel.dispatchEvent(new CustomEvent('galaxy-direction-phase-change',{detail:{direction:d,phase,lotNumber}}));
  }
  previousPhase=phase;previousLot=lotNumber;
  if(lotNumber!==null)await history(panel,d,lotNumber,token).catch(()=>{});
  if(phase==='sold'&&lotNumber!==null)await result(panel,d,lotNumber,token).catch(()=>{});
 }catch(error){console.warn('Direction refresh unavailable',error);}
 finally{busy=false;}
}
document.addEventListener('click',event=>{
 const card=event.target.closest('#auctionDirectionDubai,#auctionDirectionTransfer');
 if(card){direction=card.id==='auctionDirectionDubai'?'dubai':'transfer';lot=null;previousLot=null;previousPhase='';generation++;}
 if(event.target.closest('#modernBottomNav,#directionCatalogBack')){direction=null;lot=null;previousLot=null;previousPhase='';generation++;}
});
setInterval(refresh,3000);
})();

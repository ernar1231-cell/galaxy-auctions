(function(){
'use strict';
// Read-only refresh of Dubai/transit preview. Does not interact with USA LIVE.
const screen=()=>document.getElementById('directionCatalogScreen');
let activeDirection=null;
let activeLot=null;
let requestInFlight=false;
let generation=0;
async function refresh(){
 const panel=screen();
 if(!panel||!panel.classList.contains('open')||!activeDirection||requestInFlight)return;
 const requestGeneration=generation;
 requestInFlight=true;
 try{
  const response=await fetch('/api/direction-live-state?direction='+encodeURIComponent(activeDirection)+'&t='+Date.now(),{cache:'no-store'});
  if(!response.ok)return;
  const state=await response.json();
  if(requestGeneration!==generation||!panel.classList.contains('open'))return;
  const current=state.currentLot;
  const lotId=current?Number(current.lot_number):null;
  if(lotId!==null&&lotId!==activeLot){
   activeLot=lotId;
   // Do not replace the selected lot's DOM here: the catalog owns the gallery and handlers.
   const currentIndex=(state.queue||[]).findIndex(x=>Number(x.lot_number)===lotId);
   const buttons=panel.querySelectorAll('[data-direction-index]');
   if(currentIndex>=0&&buttons[currentIndex])buttons[currentIndex].click();
  }
  const label=panel.querySelector('#directionPhaseLabel');
  if(label)label.textContent=state.enabled?'Фаза: '+String(state.phase||'waiting'):'Ожидаем начало аукциона';
  const price=panel.querySelector('#directionCurrentBid');
  if(price)price.textContent=state.enabled&&state.currentBid!=null?'Текущая ставка $'+Number(state.currentBid).toLocaleString('en-US'):'Ставки пока недоступны';
 }catch(error){console.warn('Direction state refresh unavailable',error);}
 finally{requestInFlight=false;}
}
document.addEventListener('click',event=>{
 const card=event.target.closest('#auctionDirectionDubai,#auctionDirectionTransfer');
 if(card){screen()?.dispatchEvent(new Event('galaxy-direction-close'));activeDirection=card.id==='auctionDirectionDubai'?'dubai':'transfer';activeLot=null;generation++;}
 if(event.target.closest('#modernBottomNav,#directionCatalogBack')){screen()?.dispatchEvent(new Event('galaxy-direction-close'));activeDirection=null;activeLot=null;generation++;}
});
setInterval(refresh,3000);
})();

(function(){
'use strict';
// Independent, fail-closed Dubai demo controller. Never calls live bid APIs.
let busy=false,available=false,lastPanel=null,pollBusy=false,revision=0;
const money=n=>'$'+Number(n).toLocaleString('en-US');
function activePanel(){
 const panel=document.getElementById('directionCatalogScreen');
 if(!panel?.classList.contains('open'))return null;
 if(!String(document.getElementById('directionCatalogTitle')?.textContent||'').includes('Дубай'))return null;
 if(panel.dataset.visibleLotNumber!=='69')return null;
 return panel;
}
async function tick(){
 const panel=activePanel();
 if(!panel){available=false;lastPanel=null;revision++;return;}
 if(pollBusy||busy)return;
 pollBusy=true;
 const requestRevision=revision;
 let control=panel.querySelector('#dubaiDemoQuickBid');
 if(!control){
  const row=panel.querySelector('.directionLiveBid');
  if(!row)return;
  control=document.createElement('button');
  control.type='button';control.id='dubaiDemoQuickBid';control.disabled=true;
  control.textContent='ПРОВЕРКА ТЕСТА…';control.style.cssText='width:100%;margin-top:10px;padding:14px;border-radius:12px;background:#166534;color:white;font-weight:700;';
  row.insertAdjacentElement('afterend',control);
  control.addEventListener('click',async()=>{
   if(!available){void tick();return;}
   if(busy||activePanel()!==panel)return;
   const initData=window.Telegram?.WebApp?.initData;
   if(!initData){window.alert('Откройте тест через Telegram');return;}
   busy=true;revision++;control.disabled=true;
   try{
    const r=await fetch('/api/direction-demo-bid',{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify({direction:'dubai',lotNumber:69,mode:'manual',amount:100,initData})});
    const data=await r.json();
    if(!r.ok||data.demo!==true)throw Error('Тестовая ставка отклонена');
    show(panel,data.currentBid);
   }catch(e){window.alert(e.message||'Ошибка тестовой ставки');}
   finally{busy=false;control.disabled=!available;void tick();}
  });
 }
 lastPanel=panel;
 try{
  const r=await fetch('/api/direction-demo-bid',{cache:'no-store'});
  if(!r.ok)throw Error('HTTP '+r.status);
  const data=await r.json();
  if(data.demo!==true||data.direction!=='dubai'||Number(data.lotNumber)!==69||!Number.isFinite(Number(data.currentBid)))throw Error('Invalid demo state');
  if(activePanel()!==panel||requestRevision!==revision)return;
  available=true;control.disabled=busy;control.textContent='ТЕСТ +$100';
  panel.querySelector('#dubaiDemoStatus')?.remove();
  show(panel,data.currentBid);
 }catch(error){
  if(activePanel()!==panel||requestRevision!==revision)return;
  available=false;control.disabled=false;control.textContent='ПОВТОРИТЬ ПРОВЕРКУ ТЕСТА';
  control.title=String(error?.message||'Ошибка загрузки');
  let note=panel.querySelector('#dubaiDemoStatus');
  if(!note){note=document.createElement('p');note.id='dubaiDemoStatus';control.insertAdjacentElement('afterend',note);}
  note.textContent='Тестовый API: '+String(error?.message||'ошибка')+' · нажмите повторить';
 }finally{pollBusy=false;}
}
function show(panel,value){
 const clock=panel.querySelector('#directionLiveCountdown');
 if(clock){clock.textContent='ТЕСТ '+money(value);clock.dataset.demoPrice='true';}
 const price=panel.querySelector('#directionDemoPrice');
 if(price)price.textContent='Тестовая цена: '+money(value);
}
setInterval(tick,2000);
document.addEventListener('DOMContentLoaded',tick);
})();

(function(){
'use strict';
// Test-only controls. This module never calls the real auction bidding endpoints.
window.GalaxyDualDemoActive=true;
const specs={dubai:{lot:69,title:'Дубай'},transfer:{lot:70,title:'пути'}};
let busy=false,pollBusy=false,revision=0,ready=false,activeKey='';
const money=n=>'$'+Number(n).toLocaleString('en-US');
function context(){
 const panel=document.getElementById('directionCatalogScreen');
 if(!panel?.classList.contains('open'))return null;
 const title=document.getElementById('directionCatalogTitle')?.textContent||'';
 const direction=title.includes('Дубай')?'dubai':title.includes('пути')?'transfer':null;
 const spec=specs[direction];
 if(!spec||panel.dataset.visibleLotNumber!==String(spec.lot))return null;
 return {panel,direction,lot:spec.lot};
}
function controls(ctx){
 let root=ctx.panel.querySelector('#galaxyDualDemo');
 if(root && root.dataset.demoDirection !== ctx.direction){root.remove();root=null;}
 if(!root){
  root=document.createElement('section');
  root.dataset.demoDirection=ctx.direction;root.id='galaxyDualDemo';
  root.style.cssText='margin:12px 14px;padding:12px;border:2px solid #166534;border-radius:12px;background:#ecfdf5;color:#14532d;';
  root.innerHTML='<strong>ТЕСТ — УСЛОВНЫЕ СТАВКИ, НЕ ПОКУПКА</strong><p id="dualDemoPrice">Загрузка…</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" data-demo-mode="manual" data-amount="100">ТЕСТ +$100</button><button type="button" data-demo-mode="manual" data-amount="1000">ТЕСТ +$1000</button></div><div style="display:flex;gap:8px;margin-top:10px"><input id="dualDemoMaximum" type="number" min="1" step="100" placeholder="Proxy максимум, $" style="min-width:0;flex:1"><button type="button" data-demo-mode="proxy">ТЕСТ PROXY</button></div><p id="dualDemoMessage">Ожидаем сервер…</p>';
  const row=ctx.panel.querySelector('.directionLiveBid');
  if(!row)return null;
  row.insertAdjacentElement('afterend',root);
  root.addEventListener('click',async e=>{
   const button=e.target.closest('button[data-demo-mode]');
   if(!button||busy||!ready)return;
   const current=context();
   if(!current||current.panel!==ctx.panel||current.direction!==root.dataset.demoDirection)return;
   const initData=window.Telegram?.WebApp?.initData;
   if(!initData){window.alert('Тест доступен только внутри Telegram');return;}
   const mode=button.dataset.demoMode;
   const amount=mode==='proxy'?Number(root.querySelector('#dualDemoMaximum')?.value):Number(button.dataset.amount);
   if(!Number.isSafeInteger(amount)||amount<=0){window.alert('Укажите максимальную сумму');return;}
   busy=true;revision++;const requestDirection=current.direction;toggle(root,true);
   try{
    const response=await fetch('/api/direction-demo-bid',{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify({direction:current.direction,lotNumber:current.lot,mode,amount,initData})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok||data.demo!==true)throw Error(data.code||data.error||'Ставка отклонена');
    if(data.direction!==requestDirection||Number(data.lotNumber)!==current.lot)throw Error('Wrong demo response');
    if(context()?.direction===requestDirection)render(current,data.currentBid);
   }catch(err){root.querySelector('#dualDemoMessage').textContent='Ошибка: '+String(err.message||err);}
   finally{busy=false;toggle(root,false);void poll();}
  });
 }
 return root;
}
function toggle(root,disabled){root.querySelectorAll('button,input').forEach(x=>x.disabled=disabled);}
function render(ctx,value){
 const root=ctx.panel.querySelector('#galaxyDualDemo');
 if(root){root.querySelector('#dualDemoPrice').textContent='Тестовая цена: '+money(value);root.querySelector('#dualDemoMessage').textContent='Данные обновляются на всех телефонах каждые 2 секунды';}
 const circle=ctx.panel.querySelector('#directionLiveCountdown');
 if(circle){circle.dataset.demoPrice='true';circle.textContent='ТЕСТ '+money(value);}
}
async function poll(){
 const ctx=context(),key=ctx?ctx.direction+':'+ctx.lot:'';
 if(key!==activeKey){activeKey=key;revision++;ready=false;}
 if(!ctx||busy||pollBusy)return;
 const root=controls(ctx);if(!root)return;
 pollBusy=true;const rev=revision;
 try{
  const response=await fetch('/api/direction-demo-bid?direction='+encodeURIComponent(ctx.direction),{cache:'no-store'});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(data.code||data.error||'HTTP '+response.status);
  if(data.demo!==true||data.direction!==ctx.direction||Number(data.lotNumber)!==ctx.lot||!Number.isFinite(Number(data.currentBid)))throw Error('Неверный тестовый лот');
  if(rev!==revision||context()?.direction!==ctx.direction||context()?.lot!==ctx.lot)return;
  ready=true;toggle(root,false);render(ctx,data.currentBid);
 }catch(err){
  if(rev!==revision)return;
  ready=false;toggle(root,true);
  root.querySelector('#dualDemoMessage').textContent='Тестовый API: '+String(err.message||err);
 }finally{pollBusy=false;}
}
setInterval(poll,500);
document.addEventListener('DOMContentLoaded',poll);
})();

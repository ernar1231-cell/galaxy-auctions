(function(){
'use strict';
// Direction display only. Does not enable bidding, buyout, or modify USA LIVE state.
const labels={usa:'🇺🇸 Америка',dubai:'🇦🇪 Дубай',transfer:'🚢 Транзит'};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time=v=>{let n=Math.max(0,Math.floor(Number(v)||0));return [Math.floor(n/3600),Math.floor(n%3600/60),n%60].map(x=>String(x).padStart(2,'0')).join(':')};
let last='',busy=false;
const panel=document.createElement('div');
panel.id='unifiedDirectionDisplay';
panel.style.cssText='display:none;position:absolute;inset:0;z-index:1001;background:white;overflow:auto;padding:12px;box-sizing:border-box;color:#132d50;font:16px -apple-system,BlinkMacSystemFont,sans-serif';
const live=document.querySelector('.livegrid');
if(!live)return;
live.style.position='relative';live.appendChild(panel);
async function tick(){
 if(busy||!panel.isConnected)return;busy=true;
 try{
  const r=await fetch('/api/unified-live-preview',{cache:'no-store'});
  if(!r.ok)throw Error('schedule');
  const data=await r.json(),direction=data.displayDirection;
  if(direction==='usa'){panel.style.display='none';return}
  const q=await fetch('/api/direction-live-state?direction='+encodeURIComponent(direction),{cache:'no-store'});
  if(!q.ok)throw Error('direction');
  const state=await q.json(),lot=state.currentLot||state.queue?.[0];
  if(!lot)throw Error('no vehicle');
  const active=state.enabled===true&&state.biddingAvailable===true&&state.phase!=='waiting';
  // Do not hide real USA bidding UI with a fake alternative while any direction is actively bidding.
  const name=[lot.make,lot.model,lot.year].filter(Boolean).join(' ');
  const images=(lot.images||[]).map(x=>typeof x==='string'?x:x.image_url).filter(Boolean);
  const photo=lot.primary_image||images[0]||'';
  const phaseLabel=active?'LIVE · '+esc(labels[direction]):'Ожидание LIVE · '+esc(labels[direction]);
  const current=active&&state.currentBid!=null?'$'+Number(state.currentBid).toLocaleString('en-US'):'—';
  const remaining=data.phase==='waiting'?data.secondsRemaining:state.phaseClock?.secondsRemaining;
  const key=[direction,lot.id,active,current,Math.floor((remaining||0)/15)].join('|');
  if(key!==last){
   last=key;
   panel.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px"><strong style="background:#123a70;color:white;border-radius:24px;padding:10px">'+esc(labels[direction])+'</strong><span>👥 '+esc(document.getElementById('liveAudienceCompact')?.textContent?.replace(/[^0-9]/g,'')||'—')+'</span><button id="unifiedShowLots" style="background:#edf5ff;border:0;padding:10px;color:#087bfa;border-radius:10px">Лоты ('+Number(state.lotCount||0)+') ›</button></div><div style="background:#f0f4f8;border-radius:14px;display:flex;justify-content:center;align-items:center;min-height:250px">'+(photo?'<img alt="Автомобиль" src="'+esc(photo)+'" style="width:100%;max-height:55vh;object-fit:contain">':'Фото недоступно')+'</div><h2>'+esc(name)+'</h2><div style="line-height:2;border-top:1px solid #e1e8f0">Пробег: '+esc(lot.mileage??'—')+'<hr>Двигатель: '+esc(lot.engine??'—')+'<hr>VIN: '+esc(lot.vin??'—')+'</div><div style="background:#f4f8fd;border:1px solid #d4e4f8;border-radius:16px;padding:18px"><strong>'+phaseLabel+'</strong><p>До следующего этапа / осталось: '+time(remaining)+'</p><p>Стартовая цена: $'+Number(lot.starting_bid||0).toLocaleString('en-US')+'</p><p>Текущая ставка: '+current+'</p><p>Реальные ставки через этот экран недоступны до завершения серверного подключения.</p></div>';
   panel.querySelector('#unifiedShowLots').onclick=()=>window.galaxyOpenDirectionLots?.(direction);
  }
  panel.style.display='block';
 }catch{panel.style.display='none'}finally{busy=false}
}
tick();setInterval(tick,15000);
})();

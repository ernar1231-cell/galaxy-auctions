(function(){
'use strict';
// Explicit preview mode only. The existing USA auction and its bidding controls remain authoritative.
if(new URLSearchParams(location.search).get('unifiedPreview')!=='1')return;
const labels={usa:'🇺🇸 Америка',dubai:'🇦🇪 Дубай',transfer:'🚢 Транзит'};
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const panel=document.createElement('section');
panel.id='unifiedSchedulePreview';
panel.setAttribute('aria-label','Тестовый просмотр следующего аукциона');
panel.style.cssText='position:fixed;inset:90px 10px 80px;z-index:10020;background:white;border:2px solid #c6def8;border-radius:18px;padding:18px;overflow:auto;box-shadow:0 12px 45px #17345945;color:#142c4c;font:16px -apple-system,BlinkMacSystemFont,sans-serif';
panel.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center"><strong>Тест общего LIVE · без ставок</strong><button id="unifiedPreviewClose" style="font-size:25px;border:0;background:transparent">×</button></div><div id="unifiedPreviewContent" style="padding-top:20px">Загрузка расписания…</div>';
document.body.appendChild(panel);
panel.querySelector('#unifiedPreviewClose').onclick=()=>panel.remove();
const content=panel.querySelector('#unifiedPreviewContent');
function duration(sec){sec=Math.max(0,Number(sec)||0);return [Math.floor(sec/3600),Math.floor(sec%3600/60),Math.floor(sec%60)].map(n=>String(n).padStart(2,'0')).join(':')}
async function refresh(){
 if(!panel.isConnected)return;
 try{
  const r=await fetch('/api/unified-live-preview',{cache:'no-store'});
  if(!r.ok)throw Error('Preview unavailable');
  const d=await r.json(),lot=d.previewLot;
  const name=labels[d.displayDirection]||'Ожидание';
  content.innerHTML='<div style="font-size:24px;font-weight:800">'+escape(name)+'</div><p>'+escape(d.phase==='waiting'?'Ожидание следующего аукциона':'Запланированное время торгов')+'</p><div style="font-size:38px;font-weight:800">'+duration(d.secondsRemaining)+'</div>'+(lot?'<img style="width:100%;max-height:45vh;object-fit:contain;border-radius:14px" src="'+escape(lot.image||'')+'" alt="Фото следующего лота"><h3>'+escape(lot.title)+'</h3><p>Стартовая цена: '+(Number.isFinite(Number(lot.startingBid))?'$'+Number(lot.startingBid).toLocaleString('en-US'):'—')+'</p>':'<p>Данные следующего автомобиля ещё не получены.</p>')+'<p style="color:#a34b27;font-weight:700">Демонстрация: реальные ставки и переключение LIVE не включены.</p>';
 }catch{content.textContent='Не удалось загрузить расписание. Рабочий LIVE не изменён.'}
}
refresh();const interval=setInterval(()=>{if(!panel.isConnected){clearInterval(interval);return}refresh()},15000);
})();

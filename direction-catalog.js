(function(){
'use strict';
const $=id=>document.getElementById(id);
const labels={dubai:['🇦🇪 Аукцион Дубай','Автомобили Дубая · каталог лотов'],transfer:['🚢 Автомобили в пути','Автомобили в доставке · каталог']};
function directionOf(l){const match=String(l.description||'').match(/\[GALAXY_DIRECTION:(\{[^\n]*?\})\]/);if(match){try{return JSON.parse(match[1]).direction||'usa'}catch(e){}}return 'usa'}
function safe(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function back(){const screen=$('directionCatalogScreen');if(screen)screen.classList.remove('open');$('auctionDirectionScreen')?.classList.add('open')}
async function open(direction){
 const screen=$('directionCatalogScreen');if(!screen)return;
 document.querySelectorAll('.modernScreen').forEach(x=>x.classList.remove('open'));
 screen.classList.add('open');$('directionCatalogTitle').textContent=labels[direction][0];$('directionCatalogSubtitle').textContent=labels[direction][1];
 const root=$('directionCatalogItems');root.textContent='Загрузка автомобилей…';
 try{
  const r=await fetch('/api/public-lots?t='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('Каталог временно недоступен');
  const data=await r.json();if(!screen.classList.contains('open'))return;
  const cars=(Array.isArray(data.lots)?data.lots:[]).filter(l=>directionOf(l)===direction);
  root.innerHTML=cars.length?cars.map(l=>{
   const image=l.primary_image||l.images?.[0]?.image_url||'';
   return '<article class="directionCatalogCar">'+(image?'<img loading="lazy" src="'+safe(image)+'" alt="Автомобиль">':'<div class="directionCatalogNoImage">🚘</div>')+
    '<div><b>'+safe([l.make,l.model,l.year].filter(Boolean).join(' '))+'</b><small>Лот № '+safe(l.lot_number||'—')+'</small><small>Статус: '+safe(l.status==='live'?'LIVE':'Предстоящий')+'</small></div></article>';
  }).join(''):'<div class="directionCatalogEmpty">Пока нет опубликованных автомобилей в этом направлении.</div>';
 }catch(e){root.textContent='Не удалось загрузить каталог. Попробуйте ещё раз.'}
}
document.addEventListener('DOMContentLoaded',()=>{
 $('auctionDirectionDubai')?.addEventListener('click',()=>open('dubai'));
 $('auctionDirectionTransfer')?.addEventListener('click',()=>open('transfer'));
 $('directionCatalogBack')?.addEventListener('click',back);
});
})();
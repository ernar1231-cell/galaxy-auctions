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
  const r=await fetch('/api/direction-queue?direction='+encodeURIComponent(direction)+'&t='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('Каталог временно недоступен');
  const data=await r.json();if(!screen.classList.contains('open'))return;
  const cars=Array.isArray(data.queue)?data.queue:[];
  let currentIndex=0;const lot=cars[currentIndex];
  if(!lot){root.innerHTML='<div class="directionLiveBrand"><img src="assets/galaxy-auctions-logo.png" alt="Galaxy Auctions"></div><div class="directionLiveStrip"><b>18:00 · Дубай</b><strong>Лоты (0)</strong></div><div class="directionCatalogEmpty">Лоты (0). Ожидаем добавления автомобилей через админку.</div>';return;}
  const photos=(lot.images||[]).map(x=>x.image_url).filter(Boolean);
  if(!photos.length&&lot.primary_image)photos.push(lot.primary_image);
  let imageIndex=0;
  const image=photos[0]||'';
  const name=[lot.make,lot.model,lot.year].filter(Boolean).join(' ');
  const details=[['Пробег',lot.mileage],['Двигатель',lot.engine],['Топливо',lot.fuel],['Трансмиссия',lot.transmission],['Привод',lot.drivetrain],['Салон',lot.interior_color],['Цвет',lot.color],['VIN',lot.vin]];
  root.innerHTML='<div class="directionLiveBrand"><img src="assets/galaxy-auctions-logo.png" alt="Galaxy Auctions"><span aria-hidden="true">♧</span></div><div class="directionLiveStatus"><span>● LIVE AUCTION · Звук выключен</span></div>'+
    '<div class="directionLiveStrip"><b>18:00 · Дубай</b><small>Позиция 1 из '+cars.length+'</small><button type="button" id="directionLotListButton">Лоты ('+cars.length+') ›</button></div>'+
    '<div class="directionLivePhoto">'+(image?'<img id="directionLiveImage" src="'+safe(image)+'" alt="'+safe(name)+'">':'<div class="directionCatalogNoImage">🚘</div>')+
    (photos.length>1?'<button type="button" class="directionPhotoPrev" id="directionPhotoPrev">‹</button><button type="button" class="directionPhotoNext" id="directionPhotoNext">›</button>':'')+
    '<span id="directionPhotoCount">'+(photos.length?'1/'+photos.length:'Нет фото')+'</span></div>'+
    '<div class="directionLiveInfo"><section><h3>'+safe(name)+'</h3>'+details.filter(x=>x[1]!=null&&x[1]!=='').map(x=>'<div class="directionLiveSpec"><span>'+safe(x[0])+'</span><b>'+safe(x[1])+'</b></div>').join('')+
    '<div class="directionLiveSpec"><span>Лот №</span><b>'+safe(lot.lot_number)+'</b></div></section>'+
    '<aside><small>Ожидаем начало аукциона</small><div class="directionLiveClock">18:00</div><small>Начало по времени Дубая</small><p>Стартовая цена</p><strong>'+safe(lot.starting_bid!=null?'$'+Number(lot.starting_bid).toLocaleString('en-US'):'Уточняется')+'</strong></aside></div>'+
    '<div class="directionLiveBid"><button type="button" disabled>−</button><b>Ставки пока недоступны</b><button type="button" disabled>+</button><button type="button" disabled>СДЕЛАТЬ СТАВКУ</button></div>'+
    '<p class="directionLiveNotice">Аукцион готовится к запуску. Ставки откроются после подключения независимого LIVE.</p>';
  $('directionLotListButton')?.addEventListener('click',()=>{const items=cars.map((x,i)=>'<div>'+safe([x.make,x.model,x.year].filter(Boolean).join(' '))+' · №'+safe(x.lot_number)+'</div>').join('');const old=root.querySelector('#directionLotPicker');if(old){old.remove();return}root.insertAdjacentHTML('beforeend','<div id="directionLotPicker" class="directionLotPicker">'+items+'</div>');});
  const showPhoto=()=>{const img=$('directionLiveImage');if(img)img.src=photos[imageIndex];$('directionPhotoCount').textContent=(imageIndex+1)+'/'+photos.length;};
  $('directionPhotoPrev')?.addEventListener('click',()=>{imageIndex=(imageIndex+photos.length-1)%photos.length;showPhoto()});
  $('directionPhotoNext')?.addEventListener('click',()=>{imageIndex=(imageIndex+1)%photos.length;showPhoto()});
 }catch(e){root.textContent='Не удалось загрузить каталог. Попробуйте ещё раз.'}
}
window.galaxyOpenDirectionCatalog=open;
function bindDirectionButtons(){
 $('directionCatalogBack')?.addEventListener('click',back);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindDirectionButtons,{once:true});else bindDirectionButtons();
})();
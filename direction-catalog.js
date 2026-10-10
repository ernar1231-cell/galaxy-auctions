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
  window.galaxyDirectionCars=cars;
  window.galaxyDirectionSelected=direction;
  window.galaxyDirectionIndex=0;
  renderDirectionLot();

 }catch(e){root.textContent='Не удалось загрузить каталог. Попробуйте ещё раз.'}
}

function renderDirectionLot(){
 const cars=window.galaxyDirectionCars||[],root=$('directionCatalogItems');
 if(!cars.length){root.innerHTML='<div class="directionCatalogEmpty">Пока нет опубликованных автомобилей в этом направлении.</div>';return}
 const index=Math.max(0,Math.min(window.galaxyDirectionIndex||0,cars.length-1)),l=cars[index];
 const photos=(l.images||[]).map(x=>x.image_url).filter(Boolean);
 if(!photos.length&&l.primary_image)photos.push(l.primary_image);
 const pic=photos[0]||'';
 const specs=[['Пробег',l.mileage==null?'—':Number(l.mileage).toLocaleString('ru-RU')+' миль'],['Двигатель',l.engine||'—'],['Топливо',l.fuel||'—'],['Трансмиссия',l.transmission||'—'],['VIN',l.vin||'—']];
 root.innerHTML='<div class="directionLiveMeta">● АУКЦИОН · '+safe(window.galaxyDirectionSelected==='dubai'?'ДУБАЙ':'В ПУТИ')+' <span>Лоты ('+cars.length+')</span></div>'+
 '<div class="directionLiveHero">'+(pic?'<img id="directionLivePhoto" src="'+safe(pic)+'" alt="Фото автомобиля">':'<div class="directionCatalogNoImage">🚘</div>')+
 '<button type="button" id="directionPrevPhoto" aria-label="Предыдущее фото">‹</button><button type="button" id="directionNextPhoto" aria-label="Следующее фото">›</button><small id="directionPhotoPosition">1/'+Math.max(1,photos.length)+'</small></div>'+
 '<div class="directionLiveTitle"><b>'+safe([l.make,l.model,l.year].filter(Boolean).join(' '))+'</b><small>Лот № '+safe(l.lot_number||'—')+' · '+(index+1)+' из '+cars.length+'</small></div>'+
 '<div class="directionLiveInfo"><div>'+specs.map(([k,v])=>'<p><span>'+safe(k)+'</span><strong>'+safe(v)+'</strong></p>').join('')+'</div>'+
 '<aside><small>Стартовая цена</small><b>
 $('auctionDirectionDubai')?.addEventListener('click',()=>open('dubai'));
 $('auctionDirectionTransfer')?.addEventListener('click',()=>open('transfer'));
 $('directionCatalogBack')?.addEventListener('click',back);
});
})();+Number(l.starting_bid||0).toLocaleString('en-US')+'</b><small>Статус: '+safe(l.status==='live'?'LIVE':'Предстоящий')+'</small></aside></div>'+
 '<div class="directionLiveActions"><button id="directionPrevLot" type="button">‹ Предыдущий</button><button id="directionNextLot" type="button">Следующий ›</button></div>'+
 '<div class="directionLiveNotice">Просмотр лота. Ставки этого направления пока не подключены к отдельному серверу торгов.</div>';
 let p=0;function photo(delta){if(!photos.length)return;p=(p+delta+photos.length)%photos.length;$('directionLivePhoto').src=photos[p];$('directionPhotoPosition').textContent=(p+1)+'/'+photos.length}
 $('directionPrevPhoto').onclick=()=>photo(-1);$('directionNextPhoto').onclick=()=>photo(1);
 $('directionPrevLot').onclick=()=>{window.galaxyDirectionIndex=(index+cars.length-1)%cars.length;renderDirectionLot()};
 $('directionNextLot').onclick=()=>{window.galaxyDirectionIndex=(index+1)%cars.length;renderDirectionLot()};
}

document.addEventListener('DOMContentLoaded',()=>{
 $('auctionDirectionDubai')?.addEventListener('click',()=>open('dubai'));
 $('auctionDirectionTransfer')?.addEventListener('click',()=>open('transfer'));
 $('directionCatalogBack')?.addEventListener('click',back);
});
})();
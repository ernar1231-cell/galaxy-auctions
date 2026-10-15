(function(){'use strict';
const $=id=>document.getElementById(id);
const picker=$('directionLotsOverlay'),list=$('directionLotsListOverlay');
if(!picker||!list)return;
const show=el=>{el.classList.add('open');el.style.display='flex';el.style.zIndex='9998';};
const hide=el=>{if(!el)return;el.classList.remove('open');if(el===picker||el===list)el.style.display='none';};
function openPicker(){hide($('catalogOverlay'));hide(list);show(picker);refreshClocks();refreshCounts();}
window.galaxyOpenLotDirectionPicker=openPicker;
// Bind directly after app.js: the three-direction picker is the only entry from Lots.
const lotsButton=$('lotsBtn');
if(lotsButton){lotsButton.onclick=function(event){event?.preventDefault();openPicker();return false;};}

// Ensure the first Lots tap always opens the three-direction picker, even if
// another legacy click listener is registered on the live button.
document.addEventListener('click',event=>{
 const target=event.target;
 if(target&&target.closest&&target.closest('#lotsBtn')){
  event.preventDefault();event.stopImmediatePropagation();openPicker();
 }
},true);
// When leaving the existing USA catalog, return to the three-direction list.
const closeUSA=$('closeCatalog');
if(closeUSA)closeUSA.addEventListener('click',()=>{
 queueMicrotask(()=>openPicker());
});
$('closeDirectionLots')?.addEventListener('click',()=>hide(picker));
$('closeDirectionLotsList')?.addEventListener('click',()=>{hide(list);show(picker)});
for(const el of [picker,list])el.addEventListener('click',e=>{if(e.target===el)hide(el)});
const startHours={usa:13,dubai:17,transfer:21};
const pad=n=>String(n).padStart(2,'0');
function dubaiClock(now){const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Dubai',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(now);const v={};for(const x of parts)if(x.type!=='literal')v[x.type]=Number(x.value);return v.hour*3600+v.minute*60+v.second;}
function countdown(direction,now=new Date()){
 const seconds=dubaiClock(now),start=startHours[direction]*3600,end=(start+4*3600)%86400;
 const live=end>start?seconds>=start&&seconds<end:seconds>=start||seconds<end;
 if(live)return 'LIVE';
 const remaining=(start-seconds+86400)%86400;
 return [Math.floor(remaining/3600),Math.floor(remaining%3600/60),remaining%60].map(pad).join(':');
}
function refreshClocks(){for(const direction of Object.keys(startHours)){const el=picker.querySelector('[data-lots-clock="'+direction+'"]');if(el)el.textContent=countdown(direction);}}
refreshClocks();const clockInterval=setInterval(()=>{if(picker.classList.contains('open'))refreshClocks()},1000);
async function refreshCounts(){const usa=picker.querySelector('[data-lots-count="usa"]');const match=($('lotsBtn')?.textContent||'').match(/\((\d+)\)/);if(usa&&match)usa.textContent='Лоты: '+match[1];for(const direction of ['dubai','transfer']){try{const r=await fetch('/api/direction-queue?direction='+direction,{cache:'no-store'});if(!r.ok)continue;const data=await r.json();const el=picker.querySelector('[data-lots-count="'+direction+'"]');if(el&&Array.isArray(data.queue))el.textContent='Лоты: '+data.queue.length;}catch{}}}
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Read-only detail view for Dubai and Transit. Never reuses USA bid controls.
const detail=document.createElement('div');detail.id='directionLotDetailOverlay';detail.className='catalogOverlay';detail.innerHTML='<div class="catalogSheet" style="overflow-y:auto;max-height:85vh"><div class="sheetHead"><b>АВТОМОБИЛЬ</b><button type="button" class="sheetClose" id="directionLotDetailClose">×</button></div><div id="directionLotDetailContent"></div></div>';
document.body.appendChild(detail);
detail.querySelector('#directionLotDetailClose').onclick=()=>hide(detail);
detail.addEventListener('click',e=>{if(e.target===detail)hide(detail)});
function openLotDetail(car,index){
 const photos=(car.images||[]).map(x=>x.image_url).filter(Boolean);if(!photos.length&&car.primary_image)photos.push(car.primary_image);
 const name=[car.make,car.model,car.year].filter(Boolean).join(' ');
 const fields=[['Пробег',car.mileage],['Двигатель',car.engine],['Топливо',car.fuel],['Трансмиссия',car.transmission],['Привод',car.drive],['Салон',car.interior_color],['Цвет',car.exterior_color],['VIN',car.vin]];
 const root=detail.querySelector('#directionLotDetailContent');
 root.innerHTML='<div class="directionDetailHero">'+(photos.length?'<img id="directionDetailHeroImage" src="'+safe(photos[0])+'" alt="'+safe(name)+'">':'<p>Нет фотографий</p>')+'</div><div class="directionDetailThumbs">'+photos.map((photo,i)=>'<button type="button" data-photo="'+i+'"><img src="'+safe(photo)+'" alt="Фото '+(i+1)+'"></button>').join('')+'</div><h2>'+safe(name)+'</h2><div class="directionDetailDescription"><b>Описание авто</b><p>Характеристики автомобиля</p></div><div class="directionDetailSpecs">'+fields.filter(x=>x[1]!=null&&x[1]!=='').map(x=>'<div><span>'+safe(x[0])+'</span><strong>'+safe(x[1])+'</strong></div>').join('')+'<div><span>Лот №</span><strong>'+safe(index+1)+'</strong></div></div><div class="directionDetailPrice"><small>Стартовая цена</small><strong>'+(car.starting_bid==null?'—':'
 hide(picker);show(list);
 const names={usa:'🇺🇸 АМЕРИКА',dubai:'🇦🇪 ДУБАЙ',transfer:'🚢 ТРАНЗИТ'};
 $('directionLotsListTitle').textContent=names[direction]||'ЛОТЫ';
 const root=$('directionLotsListItems');root.textContent='Загрузка автомобилей…';
 if(direction==='usa'){
  // Keep the authoritative USA LIVE catalog and its existing click handlers intact.
  hide(list);$('catalogOverlay')?.classList.add('open');return;
 }
 try{
  const response=await fetch('/api/direction-queue?direction='+encodeURIComponent(direction),{cache:'no-store'});
  if(!response.ok)throw Error('UNAVAILABLE');
  const data=await response.json();
  if(!list.classList.contains('open')||$('directionLotsListTitle').textContent!==names[direction])return;
  const cars=Array.isArray(data.queue)?data.queue:[];
  root.innerHTML=cars.length?cars.map((car,i)=>{
   const title=safe([car.make,car.model,car.year].filter(Boolean).join(' '));
   const photo=car.primary_image||car.images?.[0]?.image_url;
   return '<button type="button" class="directionLotsItem" data-direction-lot-index="'+i+'">'+(photo?'<img src="'+safe(photo)+'" alt="'+title+'">':'')+'<div><strong>№'+(i+1)+' · '+title+'</strong><small>VIN: '+safe(car.vin||'—')+'</small><small>Стартовая цена: '+(car.starting_bid==null?'—':'$'+Number(car.starting_bid).toLocaleString('en-US'))+'</small></div></div>';
  }).join(''):'<p style="padding:18px">Автомобили пока не назначены в очередь.</p>';
  root.querySelectorAll('[data-direction-lot-index]').forEach(btn=>btn.onclick=()=>{const i=Number(btn.dataset.directionLotIndex);if(Number.isInteger(i)&&cars[i])openLotDetail(cars[i],i)});
 }catch{root.textContent='Не удалось загрузить лоты. Попробуйте позже.';}
}
picker.querySelectorAll('[data-lots-direction]').forEach(b=>b.addEventListener('click',()=>openDirection(b.dataset.lotsDirection)));
})();
+Number(car.starting_bid).toLocaleString('en-US'))+'</strong><p>Просмотр автомобиля. Ставки в этом разделе недоступны.</p></div>';
 root.querySelectorAll('[data-photo]').forEach(btn=>btn.onclick=()=>{const img=root.querySelector('#directionDetailHeroImage');if(img)img.src=photos[Number(btn.dataset.photo)]});
 show(detail);
}
async function openDirection(direction){
 hide(picker);show(list);
 const names={usa:'🇺🇸 АМЕРИКА',dubai:'🇦🇪 ДУБАЙ',transfer:'🚢 ТРАНЗИТ'};
 $('directionLotsListTitle').textContent=names[direction]||'ЛОТЫ';
 const root=$('directionLotsListItems');root.textContent='Загрузка автомобилей…';
 if(direction==='usa'){
  // Keep the authoritative USA LIVE catalog and its existing click handlers intact.
  hide(list);$('catalogOverlay')?.classList.add('open');return;
 }
 try{
  const response=await fetch('/api/direction-queue?direction='+encodeURIComponent(direction),{cache:'no-store'});
  if(!response.ok)throw Error('UNAVAILABLE');
  const data=await response.json();
  if(!list.classList.contains('open')||$('directionLotsListTitle').textContent!==names[direction])return;
  const cars=Array.isArray(data.queue)?data.queue:[];
  root.innerHTML=cars.length?cars.map((car,i)=>{
   const title=safe([car.make,car.model,car.year].filter(Boolean).join(' '));
   const photo=car.primary_image||car.images?.[0]?.image_url;
   return '<div class="directionLotsItem">'+(photo?'<img src="'+safe(photo)+'" alt="'+title+'">':'')+'<div><strong>№'+(i+1)+' · '+title+'</strong><small>VIN: '+safe(car.vin||'—')+'</small><small>Стартовая цена: '+(car.starting_bid==null?'—':'$'+Number(car.starting_bid).toLocaleString('en-US'))+'</small></div></div>';
  }).join(''):'<p style="padding:18px">Автомобили пока не назначены в очередь.</p>';
 }catch{root.textContent='Не удалось загрузить лоты. Попробуйте позже.';}
}
picker.querySelectorAll('[data-lots-direction]').forEach(b=>b.addEventListener('click',()=>openDirection(b.dataset.lotsDirection)));
})();

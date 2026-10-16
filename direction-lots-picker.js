(function(){'use strict';
const $=id=>document.getElementById(id);
const picker=$('directionLotsOverlay'),list=$('directionLotsListOverlay');
if(!picker||!list)return;
const show=el=>{el.classList.add('open');el.style.display='flex';el.style.zIndex='9998';};
const hide=el=>{if(!el)return;el.classList.remove('open');if(el===picker||el===list)el.style.display='none';};
function openPicker(){hide($('catalogOverlay'));hide(list);show(picker);refreshClocks();refreshCounts();}
window.galaxyOpenLotDirectionPicker=openPicker;
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
  const schedule=new Intl.DateTimeFormat('ru-RU',{timeZone:'Asia/Dubai',day:'numeric',month:'long'}).format(new Date());
  const heading=$('directionLotsListTitle');
  heading.textContent=(names[direction]||'ЛОТЫ')+' · ЛОТЫ ('+cars.length+')';
  root.innerHTML=cars.length?cars.map((car,i)=>{
   const title=safe([car.make,car.model,car.year].filter(Boolean).join(' '));
   const photo=car.primary_image||car.images?.[0]?.image_url;
   const miles=car.mileage==null?'—':Number(car.mileage).toLocaleString('ru-RU')+' миль';
   const fuel=safe(car.fuel||'—');
   const status=safe(String(car.status||'upcoming').toUpperCase());
   const start=safe((data.local_start|| (direction==='dubai'?'17:00':'21:00')).slice(0,5));
   const label=schedule+' · '+start;
   const key=direction+':'+String(car.vin||car.lot_number||i);
   const favorite=(()=>{try{return JSON.parse(localStorage.getItem('galaxy-direction-favorites-v1')||'{}')['lot:'+String(car.vin||car.lot_number||title)]===true}catch{return false}})();
   return '<div class="directionLotsItem catalogItem" data-direction-index="'+i+'">'+(photo?'<img src="'+safe(photo)+'" alt="'+title+'">':'')+
   '<div class="directionLotsInfo"><b>'+safe(label)+'</b><small>'+title+'</small><small>Позиция '+(i+1)+' из '+cars.length+' • '+safe(miles)+' • '+fuel+' • <strong>'+status+'</strong></small></div>'+
   '<div class="catalogActions"><button type="button" class="starBtn'+(favorite?' on':'')+'" data-direction-star="'+i+'" aria-label="Избранное">'+(favorite?'★':'☆')+'</button><button type="button" class="catalogShareBtn" data-direction-share="'+i+'" aria-label="Поделиться">⇧</button></div></div>';
  }).join(''):'<p style="padding:18px">Автомобили пока не назначены в очередь.</p>';
  root.querySelectorAll('[data-direction-star]').forEach(button=>button.addEventListener('click',event=>{
   event.stopPropagation();const car=cars[Number(button.dataset.directionStar)];if(!car)return;
   const key='lot:'+String(car.vin||car.lot_number||[car.make,car.model,car.year].filter(Boolean).join(' '));
   try{const saved=JSON.parse(localStorage.getItem('galaxy-direction-favorites-v1')||'{}');saved[key]=!saved[key];localStorage.setItem('galaxy-direction-favorites-v1',JSON.stringify(saved));button.textContent=saved[key]?'★':'☆';button.classList.toggle('on',saved[key])}catch{}
  }));
  root.querySelectorAll('[data-direction-share]').forEach(button=>button.addEventListener('click',async event=>{
   event.stopPropagation();const car=cars[Number(button.dataset.directionShare)];if(!car)return;
   const title=[car.make,car.model,car.year].filter(Boolean).join(' ');
   if(!car.id){alert('Ссылка на автомобиль пока недоступна');return;}
   const url=new URL('/api/share',location.origin);url.searchParams.set('id',String(car.id));
   try{
    if(navigator.share)await navigator.share({title:title+' · Galaxy Auctions',text:title+' · Galaxy Auctions',url:url.toString()});
    else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url.toString());alert('Ссылка на автомобиль скопирована');}
    else window.prompt('Скопируйте ссылку на автомобиль',url.toString());
   }catch(error){if(error?.name!=='AbortError')console.error('Share failed',error);}
  }));
 }catch{root.textContent='Не удалось загрузить лоты. Попробуйте позже.';}
}
window.galaxyOpenDirectionLots=openDirection;
picker.querySelectorAll('[data-lots-direction]').forEach(b=>b.addEventListener('click',()=>openDirection(b.dataset.lotsDirection)));
})();

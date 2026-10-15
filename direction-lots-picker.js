(function(){'use strict';
const $=id=>document.getElementById(id);
const picker=$('directionLotsOverlay'),list=$('directionLotsListOverlay');
if(!picker||!list)return;
const show=el=>el.classList.add('open'),hide=el=>el.classList.remove('open');
const original=$('lotsBtn');
if(original){original.addEventListener('click',e=>{e.stopImmediatePropagation();e.preventDefault();hide($('catalogOverlay'));show(picker);},true);}
$('closeDirectionLots')?.addEventListener('click',()=>hide(picker));
$('closeDirectionLotsList')?.addEventListener('click',()=>{hide(list);show(picker)});
for(const el of [picker,list])el.addEventListener('click',e=>{if(e.target===el)hide(el)});
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
  root.innerHTML=cars.length?cars.map((car,i)=>{
   const title=safe([car.make,car.model,car.year].filter(Boolean).join(' '));
   const photo=car.primary_image||car.images?.[0]?.image_url;
   return '<div class="directionLotsItem">'+(photo?'<img src="'+safe(photo)+'" alt="'+title+'">':'')+'<div><strong>№'+(i+1)+' · '+title+'</strong><small>VIN: '+safe(car.vin||'—')+'</small><small>Стартовая цена: '+(car.starting_bid==null?'—':'$'+Number(car.starting_bid).toLocaleString('en-US'))+'</small></div></div>';
  }).join(''):'<p style="padding:18px">Автомобили пока не назначены в очередь.</p>';
 }catch{root.textContent='Не удалось загрузить лоты. Попробуйте позже.';}
}
picker.querySelectorAll('[data-lots-direction]').forEach(b=>b.addEventListener('click',()=>openDirection(b.dataset.lotsDirection)));
})();

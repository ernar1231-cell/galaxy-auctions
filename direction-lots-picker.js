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
let sharedCounts={usa:0,dubai:0,transfer:0};
let activeLiveDirection=null;
let sharedStarts=null;
const pad=n=>String(n).padStart(2,'0');
function dubaiClock(now){const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Dubai',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(now);const v={};for(const x of parts)if(x.type!=='literal')v[x.type]=Number(x.value);return v.hour*3600+v.minute*60+v.second;}
function countdown(direction,now=new Date()){
 if(activeLiveDirection===direction)return 'LIVE';
 let remaining;
 const serverStart=sharedStarts?.[direction];
 if(serverStart&&Number.isFinite(Date.parse(serverStart))){
  const target=Date.parse(serverStart);
  if(target>now.getTime())remaining=Math.ceil((target-now.getTime())/1000);
 }
 if(remaining==null){
  const seconds=dubaiClock(now),start=startHours[direction]*3600;
  remaining=(start-seconds+86400)%86400;
 }
 return [Math.floor(remaining/3600),Math.floor(remaining%3600/60),remaining%60].map(pad).join(':');
}
function refreshClocks(){for(const direction of Object.keys(startHours)){const el=picker.querySelector('[data-lots-clock="'+direction+'"]');if(el)el.textContent=countdown(direction);}}
refreshClocks();const clockInterval=setInterval(()=>{if(picker.classList.contains('open')){refreshClocks();if(Date.now()%15000<1100)refreshCounts()}},1000);
async function refreshCounts(){
 try{
  const r=await fetch('/api/one-auction-counts?t='+Date.now(),{cache:'no-store'});
  if(!r.ok)throw Error('Counts unavailable');
  const data=await r.json();
  if(!data.counts)throw Error('Invalid counts');
  sharedCounts=data.counts;
  sharedStarts=data.starts||null;
  activeLiveDirection=['usa','dubai','transfer'].includes(data.liveDirection)?data.liveDirection:null;
  for(const direction of Object.keys(startHours)){
   const el=picker.querySelector('[data-lots-count="'+direction+'"]');
   if(el)el.textContent='Лоты: '+Number(sharedCounts[direction]||0);
  }
  refreshClocks();
 }catch(error){console.warn('Shared inventory counts unavailable',error);}
}
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function openDirection(direction){
 hide(picker);show(list);
 const names={usa:'🇺🇸 АМЕРИКА',dubai:'🇦🇪 ДУБАЙ',transfer:'🚢 АВТО В ПУТИ'};
 $('directionLotsListTitle').textContent=names[direction]||'ЛОТЫ';
 const root=$('directionLotsListItems');root.textContent='Загрузка автомобилей…';
 // All three direction lists use the same direction-filtered inventory.
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
   const rawStart=String(data.local_start||'');
   const start=safe(/^\d{4}-/.test(rawStart)?new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Dubai',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(rawStart)):(rawStart.slice(0,5)||({usa:'13:00',dubai:'17:00',transfer:'21:00'})[direction]));
   const label=schedule+' · '+start;
   const key=direction+':'+String(car.vin||car.lot_number||i);
   const favorite=(()=>{try{return JSON.parse(localStorage.getItem('galaxy-direction-favorites-v1')||'{}')['lot:'+String(car.vin||car.lot_number||title)]===true}catch{return false}})();
   return '<div class="directionLotsItem catalogItem" data-direction-index="'+i+'">'+(photo?'<img src="'+safe(photo)+'" alt="'+title+'">':'')+
   '<div class="directionLotsInfo"><b>'+safe(label)+'</b><small>'+title+'</small><small>Позиция '+(i+1)+' из '+cars.length+' • '+safe(miles)+' • '+fuel+' • <strong>'+status+'</strong></small></div>'+
   '<div class="catalogActions"><button type="button" class="starBtn'+(favorite?' on':'')+'" data-direction-star="'+i+'" aria-label="Избранное">'+(favorite?'★':'☆')+'</button><button type="button" class="catalogShareBtn" data-direction-share="'+i+'" aria-label="Поделиться">⇧</button></div></div>';
  }).join(''):'<p style="padding:18px">Автомобили пока не назначены в очередь.</p>';
  if(direction==='transfer'){
   const norm=v=>String(v||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('ru-RU');
   const definitions=[
    {id:'kz',name:'Казахстан',flag:'🇰🇿',cities:['казахстан','kazakhstan','актау','aktau','ахтау','алматы','almaty','астана','astana','атырау','шымкент']},
    {id:'ae',name:'ОАЭ',flag:'🇦🇪',cities:['оаэ','uae','дубай','dubai','абу-даби','abu dhabi','шарджа','sharjah','фуджейра','fujairah','джебель-али']},
    {id:'ge',name:'Грузия',flag:'🇬🇪',cities:['грузия','georgia','поти','poti','батуми','batumi','тбилиси','tbilisi','рустави']},
    {id:'ru',name:'Россия',flag:'🇷🇺',cities:['россия','russia','москва','moscow','санкт-петербург','владивосток','новороссийск','казань','краснодар']},
    {id:'uz',name:'Узбекистан',flag:'🇺🇿',cities:['узбекистан','uzbekistan','ташкент','tashkent','самарканд','бухара','андижан']},
    {id:'az',name:'Азербайджан',flag:'🇦🇿',cities:['азербайджан','azerbaijan','баку','baku','алят','гянджа','сумгаит']},
    {id:'kg',name:'Кыргызстан',flag:'🇰🇬',cities:['кыргызстан','киргизия','kyrgyzstan','бишкек','ош']},
    {id:'tj',name:'Таджикистан',flag:'🇹🇯',cities:['таджикистан','tajikistan','душанбе','худжанд']},
    {id:'tm',name:'Туркменистан',flag:'🇹🇲',cities:['туркменистан','turkmenistan','ашхабад','туркменбаши','мары']},
    {id:'tr',name:'Турция',flag:'🇹🇷',cities:['турция','turkey','стамбул','istanbul']},
    {id:'us',name:'США',flag:'🇺🇸',cities:['сша','usa','united states','нью-йорк','new york','лос-анджелес']}
   ];
   const countryOf=value=>{
    const v=norm(value);
    if(!v)return 'other';
    const match=definitions.find(d=>d.cities.some(city=>v===city||v.startsWith(city+',')||v.startsWith(city+' /')||v.endsWith(', '+city)));
    return match?.id||'other';
   };
   const counts=new Map();
   for(const car of cars){const id=countryOf(car.destination);counts.set(id,(counts.get(id)||0)+1);}
   const active=definitions.filter(d=>counts.has(d.id));
   if(counts.has('other'))active.push({id:'other',name:'Другие',flag:'📍'});
   const ordered=[...active].sort((a,b)=>counts.get(b.id)-counts.get(a.id));
   const bar=document.createElement('div');
   bar.setAttribute('aria-label','Страны назначения');
   bar.style.cssText='display:flex;gap:6px;overflow-x:auto;padding:8px 12px 12px;white-space:nowrap;-webkit-overflow-scrolling:touch;';
   const button=(name,count,key,flag='')=>{
    const b=document.createElement('button');b.type='button';
    b.textContent=(flag?flag+' ':'')+name+' ('+count+')';b.dataset.country=key;
    b.style.cssText='flex:0 0 auto;border:1px solid #d5e3f3;border-radius:12px;background:#eef5fc;color:#17365b;padding:9px 11px;font-size:13px;font-weight:700;';
    return b;
   };
   bar.append(button('Все',cars.length,'__all__'));
   for(const item of ordered.slice(0,4))bar.append(button(item.name,counts.get(item.id),item.id,item.flag));
   if(ordered.length>4){
    const more=document.createElement('button');more.type='button';more.textContent='Все направления ▾';more.dataset.moreCountries='1';
    more.style.cssText='flex:0 0 auto;border:1px solid #d5e3f3;border-radius:12px;background:#eef5fc;color:#17365b;padding:9px 11px;font-size:13px;font-weight:700;';
    bar.append(more);
   }
   const menu=document.createElement('div');menu.hidden=true;
   menu.style.cssText='display:none;flex-wrap:wrap;gap:7px;padding:8px 12px 12px;';
   for(const item of ordered)menu.append(button(item.name,counts.get(item.id),item.id,item.flag));
   const rows=[...root.querySelectorAll('[data-direction-index]')];
   const apply=key=>{
    rows.forEach(row=>{
     const car=cars[Number(row.dataset.directionIndex)];
     const visible=key==='__all__'||countryOf(car?.destination)===key;
     row.hidden=!visible;row.style.setProperty('display',visible?'':'none',visible?'':'important');
     row.setAttribute('aria-hidden',String(!visible));
    });
    for(const b of [...bar.querySelectorAll('[data-country]'),...menu.querySelectorAll('[data-country]')]){
     const on=b.dataset.country===key;b.style.background=on?'#1676d2':'#eef5fc';b.style.color=on?'white':'#17365b';b.setAttribute('aria-pressed',String(on));
    }
    menu.hidden=true;menu.style.display='none';
   };
   const click=e=>{
    const more=e.target.closest('[data-more-countries]');
    if(more){menu.hidden=!menu.hidden;menu.style.display=menu.hidden?'none':'flex';return;}
    const b=e.target.closest('[data-country]');if(b)apply(b.dataset.country);
   };
   bar.addEventListener('click',click);menu.addEventListener('click',click);
   root.prepend(bar,menu);apply('__all__');
  }
  root.querySelectorAll('[data-direction-index]').forEach(row=>row.addEventListener('click',async event=>{
   if(event.target.closest('button'))return;
   const car=cars[Number(row.dataset.directionIndex)];
   if(!car)return;
   // A catalog tap may open details; only the real shared LIVE screen accepts bids.
   // Always open the selected vehicle's details; never jump to another screen.
   // The existing detail panel handles LIVE and pre-bid permissions.
   const opened=await window.galaxyOpenLotDetailByNumber?.(car.lot_number,car.id);
   if(opened){
    hide(list);
    const detail=document.getElementById('detailOverlay');
    if(detail)detail.style.zIndex='10001';
   }else{
    alert('Не удалось открыть автомобиль. Повторите попытку.');
   }
  }));
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

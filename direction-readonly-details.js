/* Read-only Dubai/Transit details. USA LIVE, picker and bidding remain unchanged. */
(function(){
'use strict';
const list=document.getElementById('directionLotsListOverlay');
const usa=document.getElementById('detailOverlay');
if(!list||!usa)return;
let overlay=null;
let requestVersion=0;
const specs=[['Пробег','mileage'],['Двигатель','engine'],['Топливо','fuel'],['Трансмиссия','transmission'],['Привод','drive'],['Салон','interior_color'],['Цвет','exterior_color'],['VIN','vin'],['Спецификация','specification'],['Места','seats']];
function close(){requestVersion++;if(overlay)overlay.classList.remove('open')}
function open(car,index,direction){
 const version=++requestVersion;
 if(!overlay){
  overlay=document.createElement('div');overlay.className='detailOverlay';overlay.id='directionReadonlyVehicle';overlay.style.zIndex='10001';
  const sheet=usa.querySelector('.detailSheet').cloneNode(true);
  const panel=sheet.querySelector('.detailBidPanel');
  if(panel)panel.innerHTML='<div class="detailBidStats"><div><span>Стартовая цена</span><strong class="directionStartingPrice">—</strong></div><div><span>Статус торгов</span><strong class="directionLiveStatus">Ожидание LIVE</strong></div><div><span>Текущая ставка</span><strong class="directionCurrentBid">—</strong></div><div><span>До начала / Осталось</span><strong class="directionRemaining">—</strong></div></div><div class="directionBidNotice">Ставки здесь пока недоступны. Участвовать можно только после подтверждённого запуска соответствующего LIVE-этапа.</div>';
  sheet.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
  overlay.appendChild(sheet);document.body.appendChild(overlay);
  sheet.querySelectorAll('.sheetClose').forEach(b=>b.addEventListener('click',close));
  overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
 }
 const sheet=overlay.querySelector('.detailSheet');
 const title=[car.make,car.model,car.year].filter(Boolean).join(' ');
 const photos=(car.images||[]).map(x=>typeof x==='string'?x:x.image_url).filter(Boolean);
 if(!photos.length&&car.primary_image)photos.push(car.primary_image);
 const hero=sheet.querySelector('.detailHero'),thumbs=sheet.querySelector('.detailThumbs');
 hero.src=photos[0]||'';hero.style.display=photos.length?'block':'none';
 thumbs.replaceChildren();
 photos.forEach((src,i)=>{
  const img=document.createElement('img');img.src=src;img.alt='Фото '+(i+1);
  img.className=i===0?'active':'';
  img.onclick=()=>{hero.src=src;thumbs.querySelectorAll('img').forEach(x=>x.classList.toggle('active',x===img))};
  thumbs.appendChild(img);
 });
 sheet.querySelector('.detailTitle').textContent=title;
 sheet.querySelector('.detailLot').textContent='Лот № '+(index+1);
 const price=car.starting_bid==null?'—':'$'+Number(car.starting_bid).toLocaleString('en-US');
 sheet.querySelector('.detailChips').textContent='Стартовая цена: '+price;
 const priceLabel=sheet.querySelector('.directionStartingPrice');if(priceLabel)priceLabel.textContent=price;
 const description=String(car.description||'').replace(/\[GALAXY_DIRECTION:\{[^\n]*\}\]/g,'').trim();
 const box=sheet.querySelector('details');
 if(box){box.hidden=false;box.open=false;const paragraph=box.querySelector('p');if(paragraph)paragraph.textContent=description||'Описание автомобиля пока не добавлено в админке.';}
 const root=sheet.querySelector('.detailSpecs');root.replaceChildren();
 specs.forEach(([label,key])=>{
  if(car[key]==null||car[key]==='')return;
  const row=document.createElement('div'),span=document.createElement('span'),strong=document.createElement('b');
  row.className='detailrow';span.textContent=label;strong.textContent=String(car[key]);
  row.append(span,strong);root.appendChild(row);
 });
 overlay.classList.add('open');
 fetch('/api/direction-live-state?direction='+encodeURIComponent(direction),{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('state unavailable');return r.json()}).then(state=>{
  if(version!==requestVersion||!overlay.classList.contains('open'))return;
  const active=state.enabled===true&&state.currentLot&&String(state.currentLot.id)===String(car.id);
  const phase=String(state.phase||'waiting').toLowerCase();
  const status=sheet.querySelector('.directionLiveStatus');if(status)status.textContent=active?(phase==='waiting'?'Ожидание LIVE':'LIVE · '+phase.toUpperCase()):'Ожидание LIVE';
  const current=sheet.querySelector('.directionCurrentBid');if(current)current.textContent=active&&state.currentBid!=null?'$'+Number(state.currentBid).toLocaleString('en-US'):'—';
  const remaining=sheet.querySelector('.directionRemaining');if(remaining&&active&&state.phaseClock&&Number.isFinite(Number(state.phaseClock.secondsRemaining))){const sec=Math.max(0,Math.floor(Number(state.phaseClock.secondsRemaining)));remaining.textContent=String(Math.floor(sec/3600)).padStart(2,'0')+':'+String(Math.floor(sec%3600/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');}
 }).catch(()=>{});
}
list.addEventListener('click',async e=>{
 if(e.target.closest('button'))return;
 const row=e.target.closest('.directionLotsItem');if(!row||!list.contains(row))return;
 const rows=[...list.querySelectorAll('.directionLotsItem')],index=rows.indexOf(row);
 const title=document.getElementById('directionLotsListTitle')?.textContent||'';
 const direction=title.includes('ДУБАЙ')?'dubai':title.includes('ТРАНЗИТ')?'transfer':null;
 if(!direction||index<0)return;
 try{
  const response=await fetch('/api/direction-queue?direction='+direction,{cache:'no-store'});
  if(!response.ok)throw Error('Queue unavailable');
  const data=await response.json();
  if(!list.classList.contains('open'))return;
  const car=Array.isArray(data.queue)?data.queue[index]:null;
  if(!car)return;
  let full=car;
  if(car.id){
   try{
    const details=await fetch('/api/public-lot?id='+encodeURIComponent(car.id),{cache:'no-store'});
    if(details.ok){const payload=await details.json();if(payload.lot)full={...car,...payload.lot};}
   }catch(err){console.warn('Full lot details unavailable',err)}
  }
  if(list.classList.contains('open'))open(full,index,direction);
 }catch(err){console.warn('Unable to open direction lot',err)}
});
})();

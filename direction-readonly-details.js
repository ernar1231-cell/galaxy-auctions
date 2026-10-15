/* Read-only Dubai/Transit details. Does not alter the Lots button or direction picker. */
(function(){
'use strict';
const list=document.getElementById('directionLotsListOverlay');
const usa=document.getElementById('detailOverlay');
if(!list||!usa)return;
let overlay=null,viewer=null,activePhotos=[],activeIndex=0;
const favoriteKey='galaxy-direction-favorites-v1';
function favorites(){try{return JSON.parse(localStorage.getItem(favoriteKey)||'{}')}catch{return {}}}
function toggleFavorite(key,button){const data=favorites();data[key]=!data[key];try{localStorage.setItem(favoriteKey,JSON.stringify(data))}catch{}button.textContent=data[key]?'★ В избранном':'☆ В избранное';}
function photoViewer(index){if(!activePhotos.length)return;activeIndex=(index+activePhotos.length)%activePhotos.length;if(!viewer){viewer=document.createElement('div');viewer.className='directionPhotoViewer';viewer.innerHTML='<button type="button" class="directionPhotoClose" aria-label="Закрыть">×</button><button type="button" class="directionPhotoPrev" aria-label="Предыдущее фото">‹</button><img alt="Фотография автомобиля"><button type="button" class="directionPhotoNext" aria-label="Следующее фото">›</button><span class="directionPhotoCounter"></span>';document.body.appendChild(viewer);viewer.querySelector('.directionPhotoClose').onclick=()=>viewer.classList.remove('open');viewer.querySelector('.directionPhotoPrev').onclick=()=>photoViewer(activeIndex-1);viewer.querySelector('.directionPhotoNext').onclick=()=>photoViewer(activeIndex+1);viewer.addEventListener('click',e=>{if(e.target===viewer)viewer.classList.remove('open')});}viewer.querySelector('img').src=activePhotos[activeIndex];viewer.querySelector('.directionPhotoCounter').textContent=(activeIndex+1)+' / '+activePhotos.length;viewer.classList.add('open');}

const specs=[['Пробег','mileage'],['Двигатель','engine'],['Топливо','fuel'],['Трансмиссия','transmission'],['Привод','drive'],['Салон','interior_color'],['Цвет','exterior_color'],['VIN','vin']];
function close(){if(viewer)viewer.classList.remove('open');if(overlay)overlay.classList.remove('open');}
function open(car,index){
 if(!overlay){
  overlay=document.createElement('div');
  overlay.className='detailOverlay';overlay.id='directionReadonlyVehicle';
  const sheet=usa.querySelector('.detailSheet').cloneNode(true);
  sheet.querySelector('.detailBidPanel')?.remove();
  sheet.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
  overlay.appendChild(sheet);document.body.appendChild(overlay);
  sheet.querySelectorAll('.sheetClose').forEach(b=>b.addEventListener('click',close));
  overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
 }
 const sheet=overlay.querySelector('.detailSheet');
 const title=[car.make,car.model,car.year].filter(Boolean).join(' ');
 const photos=[car.primary_image,...(car.images||[]).map(x=>typeof x==='string'?x:x.image_url)].filter(x=>typeof x==='string'&&/^https?:\/\//.test(x));
 const uniquePhotos=[...new Set(photos)];activePhotos=uniquePhotos;
 const hero=sheet.querySelector('.detailHero'),thumbs=sheet.querySelector('.detailThumbs');
 hero.src=uniquePhotos[0]||'';hero.style.display=uniquePhotos.length?'block':'none';hero.onclick=()=>photoViewer(activePhotos.indexOf(hero.src)>=0?activePhotos.indexOf(hero.src):0);
 thumbs.replaceChildren();
 uniquePhotos.forEach((src,i)=>{
  const img=document.createElement('img');img.src=src;img.alt='Фото '+(i+1);
  img.className=i===0?'active':'';
  img.onerror=()=>img.remove();img.onclick=()=>{hero.src=src;thumbs.querySelectorAll('img').forEach(x=>x.classList.toggle('active',x===img))};
  thumbs.appendChild(img);
 });
 sheet.querySelector('.detailTitle').textContent=title;
 sheet.querySelector('.detailLot').textContent='Лот № '+(car.lot_number||index+1);
 const chips=sheet.querySelector('.detailChips');chips.replaceChildren();const price=document.createElement('span');price.textContent='Стартовая цена: '+(car.starting_bid==null?'—':'
 const description=String(car.description||'').trim(),box=sheet.querySelector('details');
 if(box){box.hidden=!description;box.open=false;const p=box.querySelector('p');if(p)p.textContent=description;}
 const root=sheet.querySelector('.detailSpecs');root.replaceChildren();
 specs.forEach(([label,key])=>{if(car[key]==null||car[key]==='')return;
  const row=document.createElement('div'),span=document.createElement('span'),strong=document.createElement('b');
  row.className='detailrow';span.textContent=label;strong.textContent=String(car[key]);
  row.append(span,strong);root.appendChild(row);
 });
 overlay.classList.add('open');sheet.scrollTop=0;
}
list.addEventListener('click',async e=>{
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
  if(car){
   let full=car;
   if(car.id){
    try{const details=await fetch('/api/public-lot?id='+encodeURIComponent(car.id),{cache:'no-store'});if(details.ok){const payload=await details.json();if(payload.lot)full={...car,...payload.lot};}}catch(err){console.warn('Full lot lookup unavailable',err)}
   }
   open(full,index);
  }
 }catch(err){console.warn('Unable to open direction lot',err);}
});
})();+Number(car.starting_bid).toLocaleString('en-US'))+' · '+String(car.status||'UPCOMING').toUpperCase();const fav=document.createElement('button');fav.type='button';fav.className='directionFavorite';const favId=String(car.vin||car.lot_number||title);const key='lot:'+favId;fav.textContent=favorites()[key]?'★ В избранном':'☆ В избранное';fav.onclick=()=>toggleFavorite(key,fav);chips.append(price,fav);
 const description=String(car.description||'').trim(),box=sheet.querySelector('details');
 if(box){box.hidden=!description;box.open=false;const p=box.querySelector('p');if(p)p.textContent=description;}
 const root=sheet.querySelector('.detailSpecs');root.replaceChildren();
 specs.forEach(([label,key])=>{if(car[key]==null||car[key]==='')return;
  const row=document.createElement('div'),span=document.createElement('span'),strong=document.createElement('b');
  row.className='detailrow';span.textContent=label;strong.textContent=String(car[key]);
  row.append(span,strong);root.appendChild(row);
 });
 overlay.classList.add('open');
}
list.addEventListener('click',async e=>{
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
  if(car)open(car,index);
 }catch(err){console.warn('Unable to open direction lot',err);}
});
})();
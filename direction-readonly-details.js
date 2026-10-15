/* Read-only Dubai/Transit details. Does not alter the Lots button or direction picker. */
(function(){
'use strict';
const list=document.getElementById('directionLotsListOverlay');
const usa=document.getElementById('detailOverlay');
if(!list||!usa)return;
let overlay=null;
const specs=[['Пробег','mileage'],['Двигатель','engine'],['Топливо','fuel'],['Трансмиссия','transmission'],['Привод','drive'],['Салон','interior_color'],['Цвет','exterior_color'],['VIN','vin']];
function close(){if(overlay)overlay.classList.remove('open');}
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
 sheet.querySelector('.detailChips').textContent='Стартовая цена: '+(car.starting_bid==null?'—':'$'+Number(car.starting_bid).toLocaleString('en-US'));
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
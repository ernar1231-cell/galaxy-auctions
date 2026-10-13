(function(){
'use strict';
const $=id=>document.getElementById(id);
let directionSoundOn=false;let directionAudio=null;let directionEffect=null;
let directionAudioContext=null;
function playDirectionEffect(phase){
 if(!directionSoundOn||!['red','green','bonus','sold'].includes(phase))return;
 try{
  const AudioContextType=window.AudioContext||window.webkitAudioContext;
  if(!AudioContextType)return;
  if(!directionAudioContext)directionAudioContext=new AudioContextType();
  if(directionAudioContext.state!=='running')return;
  const ctx=directionAudioContext,now=ctx.currentTime;
  const notes=phase==='sold'?[660,440,330]:phase==='bonus'?[660,880]:phase==='green'?[550]:[440];
  notes.forEach((hz,i)=>{
   const oscillator=ctx.createOscillator(),gain=ctx.createGain(),at=now+i*.13;
   oscillator.type='sine';oscillator.frequency.value=hz;
   gain.gain.setValueAtTime(0,at);
   gain.gain.linearRampToValueAtTime(.09,at+.015);
   gain.gain.exponentialRampToValueAtTime(.001,at+.12);
   oscillator.connect(gain);gain.connect(ctx.destination);
   oscillator.start(at);oscillator.stop(at+.13);
  });
 }catch(e){}
}

function stopDirectionAudio(){if(directionAudio){directionAudio.pause();directionAudio.currentTime=0;}if(directionEffect){directionEffect.pause();directionEffect.currentTime=0;}}
function toggleDirectionSound(){directionSoundOn=!directionSoundOn;if(!directionAudio){directionAudio=new Audio('auction-background.mp3');directionAudio.loop=true;directionAudio.volume=.3;}if(directionSoundOn){try{const AudioContextType=window.AudioContext||window.webkitAudioContext;if(AudioContextType){if(!directionAudioContext)directionAudioContext=new AudioContextType();directionAudioContext.resume().catch(()=>{});}}catch(e){}directionAudio.play().catch(()=>{directionSoundOn=false;const b=$('directionSoundToggle');if(b){b.textContent='🔇 Включить звук';b.setAttribute('aria-pressed','false');}});}else stopDirectionAudio();const b=$('directionSoundToggle');if(b){b.textContent=directionSoundOn?'🔊 Звук включён':'🔇 Включить звук';b.setAttribute('aria-pressed',String(directionSoundOn));}}
const labels={dubai:['🇦🇪 Аукцион Дубай','Автомобили Дубая · каталог лотов'],transfer:['🚢 Автомобили в пути','Автомобили в доставке · каталог']};
function directionOf(l){const match=String(l.description||'').match(/\[GALAXY_DIRECTION:(\{[^\n]*?\})\]/);if(match){try{return JSON.parse(match[1]).direction||'usa'}catch(e){}}return 'usa'}
function safe(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function back(){const panel=$('directionCatalogScreen');if(panel){delete panel.dataset.visibleLotNumber;delete panel.dataset.demoMode;}stopDirectionAudio();directionSoundOn=false;document.body.classList.remove('directionPreviewOpen');const screen=$('directionCatalogScreen');if(screen)screen.classList.remove('open');$('auctionDirectionScreen')?.classList.add('open')}
async function open(direction){
 const screen=$('directionCatalogScreen');if(!screen)return;
 document.querySelectorAll('.modernScreen').forEach(x=>x.classList.remove('open'));
 stopDirectionAudio();directionSoundOn=false;screen.classList.add('open');document.body.classList.add('directionPreviewOpen');$('directionCatalogTitle').textContent=labels[direction][0];$('directionCatalogSubtitle').textContent=labels[direction][1];
 const root=$('directionCatalogItems');root.textContent='Загрузка автомобилей…';
 try{
  let cars=[],startAt=null,clockOffsetMs=0;
  try{
   const r=await fetch('/api/direction-live-state?direction='+encodeURIComponent(direction)+'&t='+Date.now(),{cache:'no-store'});
   if(!r.ok)throw Error('Direction LIVE state unavailable');
   const data=await r.json();if(!Array.isArray(data.queue))throw Error('Invalid queue');
   cars=data.queue;startAt=data.startAt||null;if(data.serverNow)clockOffsetMs=new Date(data.serverNow).getTime()-Date.now();
  }catch(liveError){
  try{
   const r=await fetch('/api/direction-queue?direction='+encodeURIComponent(direction)+'&t='+Date.now(),{cache:'no-store'});
   if(!r.ok)throw Error('Direction queue unavailable');
   const data=await r.json();cars=Array.isArray(data.queue)?data.queue:[];
  }catch(queueError){
   const r=await fetch('/api/public-lots?t='+Date.now(),{cache:'no-store'});
   if(!r.ok)throw Error('Каталог временно недоступен');
   const data=await r.json();cars=(Array.isArray(data.lots)?data.lots:[]).filter(l=>directionOf(l)===direction);
  }
  }
  if(!screen.classList.contains('open'))return;
  let currentIndex=0;
  function renderSelectedLot(){const lot=cars[currentIndex];
  if(!lot){root.innerHTML='<div class="directionLiveBrand"><img src="assets/galaxy-auctions-logo.png" alt="Galaxy Auctions"></div><div class="directionLiveStrip"><b>18:00 · Дубай</b><strong>Лоты (0)</strong></div><div class="directionCatalogEmpty">Лоты (0). Ожидаем добавления автомобилей через админку.</div>';return;}
  const photos=(lot.images||[]).map(x=>x.image_url).filter(Boolean);
  if(!photos.length&&lot.primary_image)photos.push(lot.primary_image);
  let imageIndex=0;
  const image=photos[0]||'';
  const name=[lot.make,lot.model,lot.year].filter(Boolean).join(' ');
  screen.dataset.visibleLotNumber=String(lot.lot_number);
  delete screen.dataset.demoMode;
  const details=[['Пробег',lot.mileage],['Двигатель',lot.engine],['Топливо',lot.fuel],['Трансмиссия',lot.transmission],['Привод',lot.drive],['Салон',lot.interior_color],['Цвет',lot.exterior_color],['VIN',lot.vin]];
  root.innerHTML='<div class="directionLiveBrand"><img src="assets/galaxy-auctions-logo.png" alt="Galaxy Auctions"><span aria-hidden="true">♧</span></div><div class="directionLiveStatus"><span>● LIVE AUCTION · Звук выключен</span></div>'+
    '<div class="directionLiveStrip"><b>18:00 · Дубай</b><small>Позиция '+(currentIndex+1)+' из '+cars.length+'</small><button type="button" id="directionLotListButton">Лоты ('+cars.length+') ›</button></div>'+
    '<div class="directionLivePhoto">'+(image?'<img id="directionLiveImage" src="'+safe(image)+'" alt="'+safe(name)+'">':'<div class="directionCatalogNoImage">🚘</div>')+
    (photos.length>1?'<button type="button" class="directionPhotoPrev" id="directionPhotoPrev">‹</button><button type="button" class="directionPhotoNext" id="directionPhotoNext">›</button>':'')+
    '<span id="directionPhotoCount">'+(photos.length?'1/'+photos.length:'Нет фото')+'</span></div>'+
    '<div class="directionLiveInfo"><section><h3>'+safe(name)+'</h3>'+details.filter(x=>x[1]!=null&&x[1]!=='').map(x=>'<div class="directionLiveSpec"><span>'+safe(x[0])+'</span><b>'+safe(x[1])+'</b></div>').join('')+
    '<div class="directionLiveSpec"><span>Лот №</span><b>'+safe(currentIndex+1)+'</b></div></section>'+
    '<aside><small>Ожидаем начало аукциона</small><div class="directionLiveClock" id="directionLiveCountdown">18:00</div><small>Начало по времени Дубая</small><p>Стартовая цена</p><strong>'+safe(lot.starting_bid!=null?'$'+Number(lot.starting_bid).toLocaleString('en-US'):'Уточняется')+'</strong></aside></div>'+
    '<div class="directionLiveBid"><button type="button" id="directionBidMinus" disabled>−</button><b id="directionBidAmount">Ставки пока недоступны</b><button type="button" id="directionBidPlus" disabled>+</button><button type="button" id="directionBidSubmit" disabled>СДЕЛАТЬ СТАВКУ</button></div>'+
    '<div class="directionLiveNotice"><strong>Автоматическая ставка (Proxy)</strong><p>Укажите максимальную сумму. До проверки серверной обработки отправка отключена.</p><input id="directionProxyMaximum" type="number" min="1" step="100" inputmode="numeric" placeholder="Максимум, $" disabled><button id="directionProxySubmit" type="button" disabled>УСТАНОВИТЬ МАКСИМУМ</button></div>'+
    '<div id="directionDemoPanel" class="directionLiveNotice" hidden><strong>🧪 ТЕСТ — НЕ НАСТОЯЩИЙ АУКЦИОН</strong><p id="directionDemoPrice">Тестовая цена загружается…</p><button id="directionDemoBid100" type="button" disabled>ТЕСТ +$100</button><input id="directionDemoMax" type="number" min="1" step="100" placeholder="Тестовый максимум, $" disabled><button id="directionDemoProxy" type="button" disabled>ТЕСТ PROXY</button><p>Условные ставки. Не создают SOLD и обязательств покупки.</p></div>'+
    '<p class="directionLiveNotice">Аукцион готовится к запуску. Ставки откроются после подключения независимого LIVE.</p>';
  $('directionSoundToggle')?.addEventListener('click',toggleDirectionSound);
  $('directionLotListButton')?.addEventListener('click',()=>{
   const old=root.querySelector('#directionLotPicker');if(old){old.remove();return}
   const items=cars.map((x,i)=>'<button type="button" data-direction-index="'+i+'">'+safe([x.make,x.model,x.year].filter(Boolean).join(' '))+' · №'+safe(i+1)+'</button>').join('');
   root.insertAdjacentHTML('beforeend','<div id="directionLotPicker" class="directionLotPicker">'+items+'</div>');
   root.querySelectorAll('[data-direction-index]').forEach(btn=>btn.addEventListener('click',()=>{
    const n=Number(btn.dataset.directionIndex);if(!Number.isInteger(n)||n<0||n>=cars.length)return;
    currentIndex=n;renderSelectedLot();
   }));
  });
  let touchX=null;const photoBox=root.querySelector('.directionLivePhoto');if(photoBox){photoBox.addEventListener('touchstart',e=>{touchX=e.touches[0]?.clientX??null},{passive:true});photoBox.addEventListener('touchend',e=>{if(touchX===null||photos.length<2)return;const end=e.changedTouches[0]?.clientX??touchX;const dx=end-touchX;touchX=null;if(Math.abs(dx)>45){imageIndex=(imageIndex+(dx<0?1:photos.length-1))%photos.length;showPhoto();}},{passive:true});}
  const showPhoto=()=>{const img=$('directionLiveImage');if(img)img.src=photos[imageIndex];$('directionPhotoCount').textContent=(imageIndex+1)+'/'+photos.length;};
  $('directionPhotoPrev')?.addEventListener('click',()=>{imageIndex=(imageIndex+photos.length-1)%photos.length;showPhoto()});
  $('directionPhotoNext')?.addEventListener('click',()=>{imageIndex=(imageIndex+1)%photos.length;showPhoto()});
  }
  screen.addEventListener('galaxy-direction-current-lot',event=>{if(!screen.classList.contains('open'))return;const n=cars.findIndex(x=>Number(x.lot_number)===Number(event.detail?.lotNumber));if(n>=0&&n!==currentIndex){currentIndex=n;renderSelectedLot();}},{signal:(()=>{const controller=new AbortController();screen.addEventListener('galaxy-direction-close',()=>controller.abort(),{once:true});return controller.signal;})()});
  renderSelectedLot();
  if(!startAt){
   // Fallback when the session API is unavailable: calculate Dubai's next 18:00.
   // This is a display-only countdown and never starts bidding.
   const now=new Date(Date.now()+4*3600000);
   const dubaiHour=now.getUTCHours(),dubaiMinute=now.getUTCMinutes();
   const next=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()+(dubaiHour*60+dubaiMinute>=1080?1:0),14,0,0));
   startAt=next.toISOString();
  }
  if(startAt){const tick=()=>{if(!screen.classList.contains('open'))return;const el=$('directionLiveCountdown');if(!el||(screen.dataset.demoMode==='true'||el.dataset.demoPrice==='true'))return;const remaining=Math.max(0,Math.floor((new Date(startAt).getTime()-(Date.now()+clockOffsetMs))/1000));const hh=String(Math.floor(remaining/3600)).padStart(2,'0'),mm=String(Math.floor(remaining%3600/60)).padStart(2,'0'),ss=String(remaining%60).padStart(2,'0');el.textContent=hh+':'+mm+':'+ss;};tick();clearInterval(window.galaxyDirectionCountdownTimer);window.galaxyDirectionCountdownTimer=setInterval(tick,1000);}
 }catch(e){root.textContent='Не удалось загрузить каталог. Попробуйте ещё раз.'}
}
window.galaxyOpenDirectionCatalog=open;
$('directionCatalogScreen')?.addEventListener('galaxy-direction-phase-change',event=>playDirectionEffect(event.detail?.phase));
function bindDirectionButtons(){
 document.querySelectorAll('#modernBottomNav button').forEach(b=>b.addEventListener('click',()=>{stopDirectionAudio();directionSoundOn=false;document.body.classList.remove('directionPreviewOpen');}));
 $('directionCatalogBack')?.addEventListener('click',back);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindDirectionButtons,{once:true});else bindDirectionButtons();
})();
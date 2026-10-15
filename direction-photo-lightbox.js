/* Isolated image viewer for Dubai and Transit. Does not change lot navigation or bids. */
(function(){
'use strict';
const parent=document.getElementById('directionReadonlyVehicle');
let viewer=null,photos=[],selected=0;
function hide(){if(viewer)viewer.classList.remove('open')}
function render(){if(!viewer||!photos.length)return;viewer.querySelector('img').src=photos[selected];viewer.querySelector('.directionPhotoCount').textContent=(selected+1)+' / '+photos.length}
function show(index){
 if(!photos.length)return;
 if(!viewer){
  viewer=document.createElement('div');viewer.className='directionFullscreenPhoto';
  viewer.innerHTML='<button class="directionFullscreenClose" type="button" aria-label="Закрыть">×</button><button class="directionFullscreenPrev" type="button" aria-label="Предыдущее фото">‹</button><img alt="Фотография автомобиля"><button class="directionFullscreenNext" type="button" aria-label="Следующее фото">›</button><div class="directionPhotoCount"></div>';
  document.body.appendChild(viewer);
  viewer.querySelector('.directionFullscreenClose').onclick=hide;
  viewer.querySelector('.directionFullscreenPrev').onclick=()=>{selected=(selected-1+photos.length)%photos.length;render()};
  viewer.querySelector('.directionFullscreenNext').onclick=()=>{selected=(selected+1)%photos.length;render()};
  viewer.addEventListener('click',e=>{if(e.target===viewer)hide()});
  let startX=null;viewer.addEventListener('touchstart',e=>{startX=e.touches[0]?.clientX??null},{passive:true});
  viewer.addEventListener('touchend',e=>{if(startX===null)return;const delta=(e.changedTouches[0]?.clientX??startX)-startX;startX=null;if(Math.abs(delta)<40)return;selected=(selected+(delta<0?1:-1)+photos.length)%photos.length;render()},{passive:true});
 }
 selected=Math.max(0,Math.min(index,photos.length-1));render();viewer.classList.add('open');
}
document.addEventListener('click',e=>{
 const root=document.getElementById('directionReadonlyVehicle');
 if(!root||!root.classList.contains('open'))return;
 const image=e.target.closest('.detailHero,.detailThumbs img');
 if(!image||!root.contains(image))return;
 const hero=root.querySelector('.detailHero'),thumbs=[...root.querySelectorAll('.detailThumbs img')];
 photos=[...new Set(thumbs.map(x=>x.currentSrc||x.src).filter(Boolean))];
 if(hero?.src&&!photos.includes(hero.src))photos.unshift(hero.src);
 const index=photos.indexOf(image.currentSrc||image.src);
 // Defer until the existing thumbnail click handler has selected the image.
 setTimeout(()=>show(index>=0?index:0),0);
},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape')hide();if(!viewer?.classList.contains('open'))return;if(e.key==='ArrowLeft'){selected=(selected-1+photos.length)%photos.length;render()}if(e.key==='ArrowRight'){selected=(selected+1)%photos.length;render()}});
})();

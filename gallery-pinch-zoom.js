/* Pinch zoom for existing USA and Dubai/Transit fullscreen viewers. */
(function(){
'use strict';
function attach(viewer,img){
 if(!viewer||!img||viewer.dataset.zoomBound)return;
 viewer.dataset.zoomBound='1';
 let scale=1,x=0,y=0,startDist=0,startScale=1,startX=0,startY=0,lastTap=0;
 const dist=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);
 const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
 function draw(){img.style.transform='translate('+x+'px,'+y+'px) scale('+scale+')';img.style.transformOrigin='center center';img.style.transition='none';img.style.touchAction='none'}
 function reset(){scale=1;x=0;y=0;draw()}
 function change(delta){if(scale<=1)return;const boundX=(img.clientWidth*(scale-1))/2,boundY=(img.clientHeight*(scale-1))/2;x=clamp(x+delta[0],-boundX,boundX);y=clamp(y+delta[1],-boundY,boundY);draw()}
 img.addEventListener('touchstart',e=>{
  if(e.touches.length===2){e.preventDefault();startDist=dist(e.touches);startScale=scale;startX=(e.touches[0].clientX+e.touches[1].clientX)/2;startY=(e.touches[0].clientY+e.touches[1].clientY)/2}
  else if(e.touches.length===1){startX=e.touches[0].clientX;startY=e.touches[0].clientY}
 },{passive:false,capture:true});
 img.addEventListener('touchmove',e=>{
  if(e.touches.length===2){e.preventDefault();e.stopImmediatePropagation();scale=clamp(startScale*dist(e.touches)/Math.max(startDist,1),1,4);if(scale===1){x=0;y=0}draw()}
  else if(e.touches.length===1&&scale>1){e.preventDefault();e.stopImmediatePropagation();const t=e.touches[0];change([t.clientX-startX,t.clientY-startY]);startX=t.clientX;startY=t.clientY}
 },{passive:false,capture:true});
 img.addEventListener('touchend',e=>{if(scale>1){e.stopImmediatePropagation();if(e.touches.length===0&&scale<1.02)reset()}},{capture:true});
 img.addEventListener('dblclick',e=>{e.preventDefault();e.stopPropagation();scale=scale>1?1:2.5;x=0;y=0;draw()});
 img.addEventListener('touchend',e=>{if(e.changedTouches.length!==1||e.touches.length)return;const now=Date.now();if(now-lastTap<320){e.preventDefault();scale=scale>1?1:2.5;x=0;y=0;draw();lastTap=0}else lastTap=now},{passive:false});
 img.addEventListener('load',reset);
 const observer=new MutationObserver(()=>{if(viewer.hidden||!viewer.classList.contains('open')&&viewer.id!=='lotPhotoViewer')reset()});
 observer.observe(viewer,{attributes:true,attributeFilter:['class','hidden']});
 const next=viewer.querySelector('[class*=Next],#lotPhotoNext'),prev=viewer.querySelector('[class*=Prev],#lotPhotoPrev');
 for(const button of [next,prev])button?.addEventListener('click',reset,{capture:true});
 reset();
}
function init(){attach(document.getElementById('lotPhotoViewer'),document.getElementById('lotPhotoFull'));attach(document.querySelector('.directionFullscreenPhoto'),document.querySelector('.directionFullscreenPhoto img'))}
document.addEventListener('DOMContentLoaded',init);
const observer=new MutationObserver(init);observer.observe(document.documentElement,{childList:true,subtree:true});
})();

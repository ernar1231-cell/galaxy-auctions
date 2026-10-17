'use strict';
(function(){
 const mq=window.matchMedia('(min-width:900px)');
 let anchor=null;
 function sync(){
  const controls=document.getElementById('tradeControls');
  const bidcol=document.querySelector('.app>.livegrid>.bidcol');
  if(!controls||!bidcol)return;
  if(mq.matches){
   if(!anchor){anchor=document.createComment('original trade controls position');controls.parentNode.insertBefore(anchor,controls);}
   if(controls.parentNode!==bidcol)bidcol.appendChild(controls);
   controls.classList.add('desktopTradeControls');
  }else{
   controls.classList.remove('desktopTradeControls');
   if(anchor?.parentNode)anchor.parentNode.insertBefore(controls,anchor.nextSibling);
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});else sync();
 if(mq.addEventListener)mq.addEventListener('change',sync);else mq.addListener(sync);
})();

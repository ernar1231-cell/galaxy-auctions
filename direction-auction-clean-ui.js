(function(){
'use strict';
// Presentation-only cleanup for Dubai and Transit. USA LIVE and bid APIs unchanged.
function update(){
 const panel=document.getElementById('directionCatalogScreen');
 if(!panel)return;
 const title=document.getElementById('directionCatalogTitle')?.textContent||'';
 const isDirection=title.includes('Дубай')||title.includes('пути');
 if(!panel.classList.contains('open')||!isDirection)return;
 for(const id of ['directionPublicHistory','directionPublicResult','directionDemoPanel']){
  const node=panel.querySelector('#'+id);
  if(node)node.hidden=true;
 }
 const demo=panel.querySelector('#galaxyDualDemo');
 if(demo){
  demo.style.cssText='margin:8px 14px;padding:7px 10px;border:1px solid #e6d3a1;border-radius:8px;background:#fff8e9;color:#6d530e;font-size:12px';
  const header=demo.querySelector('strong');
  if(header)header.textContent='СИМУЛЯЦИЯ · БЕЗ ПОКУПКИ';
  const message=demo.querySelector('#dualDemoMessage');
  if(message&&message.textContent.startsWith('Данные обновляются'))message.textContent='';
 }
}
new MutationObserver(update).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden']});
document.addEventListener('DOMContentLoaded',update);
setInterval(update,1000);
})();

'use strict';
// Preview-only bilingual UI dictionary. Never translate user-entered car data or money.
(function(){
 const dictionary={
 'Главная':'Home','Аукционы':'Auctions','Мои авто':'My Cars','Профиль':'Profile',
 'В наличии':'Available','Предстоящие':'Upcoming','Ожидают решения':'Awaiting Decision',
 'Ожидают подтверждения':'Awaiting Confirmation','Проданные':'Sold',
 'Аукцион США':'USA Auction','Аукцион Дубай':'Dubai Auction','Автомобили в пути':'Cars in Transit',
 'Добавить авто':'Add Car','Сохранить':'Save','Удалить':'Delete','Удалить навсегда':'Delete Permanently',
 'Убрать из списка аукциона':'Remove from Auction List',
 'Сохранить изменения':'Save Changes','Поиск по марке, модели или VIN':'Search by make, model or VIN',
 'Пробег':'Mileage','Двигатель':'Engine','Топливо':'Fuel','Трансмиссия':'Transmission',
 'Привод':'Drivetrain','Цвет':'Color','Салон':'Interior','Год':'Year',
 'Описание':'Description','Текущая ставка':'Current Bid','Сделать ставку':'Place Bid',
 'Лоты':'Lots','Ожидаем данные':'Waiting for Data','До начала аукциона':'Until Auction Starts',
 'Мой аккаунт':'My Account','Уведомления':'Notifications','Безопасность':'Security',
 'Админ-панель':'Admin Panel','Активный аккаунт':'Active Account',
 'Верификация':'Verification','Депозит':'Deposit','Лимит ставок':'Bid Limit',
 'Русский':'Russian'
 };
 const nodes='button,span,b,small,label,h1,h2,h3,p,option';
 const original=new WeakMap();
 function current(){try{const k='galaxyLanguage:'+(window.tgUser?.id||'guest');return localStorage.getItem(k)||'ru'}catch{return 'ru'}}
 function translate(root=document){
  const lang=current();document.documentElement.lang=lang==='en'?'en':'ru';
  root.querySelectorAll(nodes).forEach(el=>{
   if(el.closest('input,textarea,[contenteditable],.adminLotCard,.carcol,.bidcol'))return;
   if(el.children.length)return;
   const text=el.textContent||'',trim=text.trim();
   if(!original.has(el))original.set(el,trim);
   const source=original.get(el);
   if(!Object.prototype.hasOwnProperty.call(dictionary,source))return;
   el.textContent=lang==='en'?dictionary[source]:source;
  });
 }
 let pending=false;
 const observer=new MutationObserver(()=>{if(pending)return;pending=true;queueMicrotask(()=>{pending=false;observer.disconnect();translate();observer.observe(document.body,{childList:true,subtree:true});});});
 function start(){translate();observer.observe(document.body,{childList:true,subtree:true});document.querySelectorAll('[data-profile-language]').forEach(b=>b.addEventListener('click',()=>queueMicrotask(()=>translate())));}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

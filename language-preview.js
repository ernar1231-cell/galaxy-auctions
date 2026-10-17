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
 'Русский':'Russian','Клиенты':'Clients','Авто':'Cars','Всё':'All','Все':'All',
 'Аукцион':'Auction','Аукцион Америка':'USA Auction','Америка':'USA','Дубай':'Dubai',
 'Авто в пути':'Cars in Transit','Мои ставки':'My Bids','История ставок':'Bid History',
 'Избранное':'Favorites','Мои покупки':'My Purchases','Регистрация':'Registration',
 'Имя':'First Name','Фамилия':'Last Name','Телефон':'Phone','Страна':'Country',
 'Город':'City','Порт отправления':'Departure Port','Срок доставки, дней':'Delivery Time, Days',
 'Транспортная компания':'Shipping Company','Трек-номер':'Tracking Number',
 'Ориентировочная дата прибытия':'Estimated Arrival Date',
 'Откуда · страна':'Origin Country','Куда':'Destination',
 'Марка':'Make','Модель':'Model','Места':'Seats','Руль':'Steering Wheel',
 'Спецификация':'Specifications','Автомат':'Automatic','Черный':'Black',
 'Закрыть':'Close','Назад':'Back','Отмена':'Cancel','Подтвердить':'Confirm',
 'Выбрать':'Select','Поиск':'Search','Обновить':'Refresh',
 'Добавить на лот':'Add to Auction','Лот удалён':'Lot Deleted',
 'Продано':'Sold','Ожидает':'Pending','В НАЛИЧИИ':'AVAILABLE',
 'ПРЕДСТОЯЩИЙ':'UPCOMING','ОЖИДАЕТ':'PENDING','ПРОДАНО':'SOLD',
 'Сохранить историю':'Preserve History','ЯЗЫК':'LANGUAGE',
 'АДМИН • ЛОТЫ':'ADMIN · LOTS','АДМИН • КЛИЕНТЫ':'ADMIN · CLIENTS',
 'РЕДАКТИРОВАТЬ АВТО':'EDIT CAR','ДОБАВИТЬ АВТО':'ADD CAR',
 'СОХРАНИТЬ ИЗМЕНЕНИЯ':'SAVE CHANGES','УДАЛИТЬ НАВСЕГДА':'DELETE PERMANENTLY',
 'УБРАТЬ ИЗ СПИСКА АУКЦИОНА':'REMOVE FROM AUCTION LIST',
 'КУПИТЬ СЕЙЧАС':'BUY NOW','СДЕЛАТЬ СТАВКУ':'PLACE BID',
 'Начальная ставка':'Starting Bid','Победитель':'Winner',
 'Ставка принята':'Bid Accepted','Аукцион завершён':'Auction Ended',
 'Выберите страну':'Select Country','Выберите порт':'Select Port',
 'США':'USA','Грузия':'Georgia','Казахстан':'Kazakhstan','Россия':'Russia',
 'Япония':'Japan','Корея':'Korea','Узбекистан':'Uzbekistan',
 'Кыргызстан':'Kyrgyzstan','Таджикистан':'Tajikistan','Туркменистан':'Turkmenistan',
 'Азербайджан':'Azerbaijan','ОАЭ':'UAE',
 'Порт назначения':'Destination Port','Пункт назначения':'Destination',
 'Страна отправления':'Origin Country','Город назначения':'Destination City',
 'Ориентировочная доставка':'Estimated Delivery',
 'Доставка':'Shipping','Отправление':'Departure','Прибытие':'Arrival',
 'Снято с аукциона':'Withdrawn from Auction',
 'Подтверждение':'Confirmation','Отправить':'Submit',
 'Выберите направление':'Choose Auction Direction',
 'Все направления':'All Destinations','Другие':'Other',
 'Участники':'Participants','Участников':'Participants',
 'до окончания':'remaining','Бонусный тайм':'Bonus Time',
 'ВЫ ЛИДИРУЕТЕ!':'YOU ARE LEADING!',
 'История':'History','Настройки':'Settings'
 };
 const nodes='button,span,b,small,label,h1,h2,h3,p,option';
 const placeholders={'Поиск по марке, модели или VIN':'Search by make, model or VIN','Выберите порт':'Select port','Выберите страну':'Select country'};
 const originalPlaceholder=new WeakMap();
 const original=new WeakMap();
 function current(){const v=typeof window.galaxySelectedLanguage==='function'?window.galaxySelectedLanguage():'ru';return v==='en'?'en':'ru'}
 function translate(root=document){
  const lang=current();document.documentElement.lang=lang==='en'?'en':'ru';
  root.querySelectorAll('input[placeholder],textarea[placeholder]').forEach(el=>{if(!originalPlaceholder.has(el))originalPlaceholder.set(el,el.getAttribute('placeholder'));const source=originalPlaceholder.get(el);if(Object.hasOwn(placeholders,source))el.setAttribute('placeholder',lang==='en'?placeholders[source]:source);});
  root.querySelectorAll(nodes).forEach(el=>{
   if(el.closest('input,textarea,[contenteditable],.adminLotCard,.carcol,.bidcol,[data-profile-language],#modernProfileLanguage'))return;
   if(el.children.length)return;
   const text=el.textContent||'',trim=text.trim();
   if(!original.has(el))original.set(el,trim);
   const source=original.get(el);
   if(trim!==source&&trim!==dictionary[source]){original.set(el,trim);}
   const key=original.get(el);
   if(!Object.prototype.hasOwnProperty.call(dictionary,key))return;
   const next=lang==='en'?dictionary[key]:key;
   if(trim!==next)el.textContent=next;
  });
 }
 let pending=false;
 const observer=new MutationObserver(()=>{if(pending)return;pending=true;queueMicrotask(()=>{pending=false;observer.disconnect();translate();observer.observe(document.body,{childList:true,subtree:true});});});
 function start(){translate();observer.observe(document.body,{childList:true,subtree:true});document.querySelectorAll('[data-profile-language]').forEach(b=>b.addEventListener('click',()=>queueMicrotask(()=>translate())));}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

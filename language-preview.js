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
 'История':'History','Настройки':'Settings',
 'Избранное':'Favorites','Отслеживание':'Tracking','Документы':'Documents',
 'Документы пока отсутствуют.':'No documents available yet.',
 'Описание авто':'Vehicle Description','АВТОМОБИЛЬ':'VEHICLE',
 'Ваша максимальная ставка':'Your Maximum Bid',
 'Выберите направление':'Choose Direction','ВЫБЕРИТЕ НАПРАВЛЕНИЕ':'CHOOSE DIRECTION',
 'Три мира. Одни возможности.':'Three worlds. One opportunity.',
 'Автомобили из Америки':'Cars from America','Автомобили в Дубае':'Cars in Dubai',
 'Машины в доставке':'Vehicles in Transit','Лотов:':'Lots:',
 'АУКЦИОН США':'USA AUCTION','АУКЦИОН ДУБАЙ':'DUBAI AUCTION',
 'Клиенты':'Clients','Авто':'Cars','Профиль':'Profile',
 'ПРЕМИАЛЬНЫЕ АВТО':'PREMIUM VEHICLES',
 'НА МИРОВЫХ АУКЦИОНАХ':'AT GLOBAL AUCTIONS',
 'Перейти к аукционам':'Explore Auctions',
 'Новости автомира':'Automotive News','Новинки мира':'Global Highlights',
 'Продано сегодня':'Sold Today','Полезные сервисы':'Useful Services',
 'Все сервисы':'All Services','Популярное сегодня':'Popular Today',
 'Смотреть все':'View All','Калькулятор':'Calculator',
 'Растаможка':'Customs Clearance','Проверка VIN':'VIN Check',
 'Новая модель':'New Model','МИРОВОЙ РЫНОК':'GLOBAL MARKET',
 'Завтра':'Tomorrow','Звук выключен':'Sound Off',
 'Звук включён':'Sound On','Ожидаем данные':'Waiting for Data',
 'до начала аукциона':'until auction starts',
 'до окончания аукциона':'until auction ends',
 'Текущая ставка':'Current Bid',
 'Всего':'Total','Предстоящие':'Upcoming',
 'Ожидают решения':'Awaiting Decision','Проданные':'Sold',
 'В наличии':'Available','Зарегистрировано в Galaxy Auctions':'Registered with Galaxy Auctions'
 };
 const nodes='button,span,b,small,label,h1,h2,h3,p,option,div';
 const placeholders={'Поиск по марке, модели или VIN':'Search by make, model or VIN','Выберите порт':'Select port','Выберите страну':'Select country'};
 const originalPlaceholder=new WeakMap();
 const original=new WeakMap();
 function current(){const v=typeof window.galaxySelectedLanguage==='function'?window.galaxySelectedLanguage():'ru';return v==='en'?'en':'ru'}
 function translate(root=document){
  const lang=current();document.documentElement.lang=lang==='en'?'en':'ru';
  root.querySelectorAll('input[placeholder],textarea[placeholder]').forEach(el=>{if(!originalPlaceholder.has(el))originalPlaceholder.set(el,el.getAttribute('placeholder'));const source=originalPlaceholder.get(el);if(Object.hasOwn(placeholders,source))el.setAttribute('placeholder',lang==='en'?placeholders[source]:source);});
  root.querySelectorAll(nodes).forEach(el=>{
   if(el.closest('input,textarea,[contenteditable],.adminLotCard,[data-profile-language],#modernProfileLanguage'))return;
   if(el.matches('div')&&!el.classList.contains('circleLabel')&&!el.classList.contains('circleSub'))return;
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

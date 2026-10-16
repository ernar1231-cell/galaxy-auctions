(function(){'use strict';
const preset=[
 ['🇰🇿','Актау'],['🇰🇿','Алматы'],['🇰🇿','Астана'],['🇰🇿','Атырау'],
 ['🇦🇪','Дубай'],['🇦🇪','Абу-Даби'],['🇦🇪','Шарджа'],
 ['🇬🇪','Поти'],['🇬🇪','Батуми'],['🇬🇪','Тбилиси'],
 ['🇺🇸','Нью-Йорк'],['🇺🇸','Лос-Анджелес'],
 ['🇺🇿','Ташкент'],['🇦🇿','Баку'],['🇹🇷','Стамбул']
];
const inputs=['lotTransitTo','manageTransitTo'];
const flagOf=name=>{
 const n=String(name).toLocaleLowerCase('ru-RU');
 const match=preset.find(x=>x[1].toLocaleLowerCase('ru-RU')===n);
 return match?match[0]:'📍';
};
function setup(input){
 if(!input||input.dataset.portPickerReady)return;
 input.dataset.portPickerReady='1';
 input.setAttribute('autocomplete','off');
 input.placeholder='Нажмите и выберите город / порт';
 input.addEventListener('click',()=>open(input));
 input.addEventListener('focus',()=>{if(!document.getElementById('galaxyDestinationPicker'))open(input)});
}
function open(input){
 if(document.getElementById('galaxyDestinationPicker'))return;
 const backdrop=document.createElement('div');backdrop.id='galaxyDestinationPicker';
 backdrop.style.cssText='position:fixed;inset:0;z-index:20050;background:rgba(10,23,45,.55);display:flex;align-items:flex-end;justify-content:center;';
 const sheet=document.createElement('section');
 sheet.style.cssText='box-sizing:border-box;background:white;color:#142c4c;border-radius:22px 22px 0 0;padding:18px 18px max(24px,env(safe-area-inset-bottom));width:100%;max-width:560px;max-height:82vh;display:flex;flex-direction:column;gap:12px;';
 const head=document.createElement('div');head.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:12px;';
 const title=document.createElement('strong');title.textContent='Куда · выберите порт или город';title.style.fontSize='18px';
 const close=document.createElement('button');close.type='button';close.textContent='✕';close.style.cssText='font-size:23px;background:#eaf3ff;color:#1676d2;border:0;border-radius:12px;padding:8px 13px;';
 head.append(title,close);
 const search=document.createElement('input');search.type='search';search.placeholder='Поиск города или порта';search.style.cssText='box-sizing:border-box;width:100%;padding:14px;border:1px solid #ccdaed;border-radius:12px;font-size:16px;';
 const results=document.createElement('div');results.style.cssText='overflow-y:auto;min-height:80px;flex:1;';
 const closePanel=()=>backdrop.remove();
 const choose=value=>{input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));closePanel();};
 const render=()=>{
  results.replaceChildren();
  const q=search.value.trim().toLocaleLowerCase('ru-RU');
  const known=[...preset];
  document.querySelectorAll('#transitDestinationOptions option').forEach(o=>{
   const name=String(o.value||'').trim();
   if(name&&!known.some(x=>x[1].toLocaleLowerCase('ru-RU')===name.toLocaleLowerCase('ru-RU')))known.push([flagOf(name),name]);
  });
  const filtered=known.filter(x=>x[1].toLocaleLowerCase('ru-RU').includes(q));
  for(const [flag,name] of filtered){
   const b=document.createElement('button');b.type='button';b.textContent=flag+'  '+name;
   b.style.cssText='display:block;width:100%;padding:13px 10px;text-align:left;background:white;border:0;border-bottom:1px solid #edf1f6;color:#163459;font-size:17px;';
   b.addEventListener('click',()=>choose(name));results.append(b);
  }
  if(q&&!known.some(x=>x[1].toLocaleLowerCase('ru-RU')===q)){
   const custom=document.createElement('button');custom.type='button';custom.textContent='＋ Добавить «'+search.value.trim()+'»';
   custom.style.cssText='display:block;width:100%;padding:14px 10px;text-align:left;border:0;background:#eef5ff;color:#126fc6;font-size:16px;';
   custom.addEventListener('click',()=>choose(search.value.trim()));results.append(custom);
  }
 };
 search.addEventListener('input',render);close.addEventListener('click',closePanel);
 backdrop.addEventListener('click',e=>{if(e.target===backdrop)closePanel();});
 sheet.append(head,search,results);backdrop.append(sheet);document.body.append(backdrop);render();
}
function init(){inputs.forEach(id=>setup(document.getElementById(id)));}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
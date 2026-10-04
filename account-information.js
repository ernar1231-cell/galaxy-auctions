(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.GalaxyAccountInformation=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const phoneCountries=[
    {country:'AE',code:'+971',flag:'🇦🇪',label:'ОАЭ'},
    {country:'KZ',code:'+7',flag:'🇰🇿',label:'Казахстан'},
    {country:'RU',code:'+7',flag:'🇷🇺',label:'Россия'},
    {country:'US',code:'+1',flag:'🇺🇸',label:'США'},
    {country:'GB',code:'+44',flag:'🇬🇧',label:'Великобритания'},
    {country:'GE',code:'+995',flag:'🇬🇪',label:'Грузия'}
  ];
  const editableFields=['email','phone','phone_country','full_name','residence_address','postal_code','mailing_address','mailing_same_as_residence'];
  const labels={email:'Email',phone:'Номер телефона',full_name:'Полное имя',residence_address:'Адрес проживания',postal_code:'Почтовый индекс',mailing_address:'Почтовый адрес'};
  function formatAddress(address){
    return address&&typeof address==='object'?[address.country,address.region,address.city,address.street].filter(Boolean).join(', '):'';
  }
  function formatPhone(number,country){
    const value=String(number||'');
    const selected=phoneCountries.find(item=>item.country===country);
    if(!selected||!value.startsWith(selected.code))return value;
    const national=value.slice(selected.code.length);
    let groups;
    if(country==='AE'&&national.length===9)groups=[national.slice(0,2),national.slice(2,5),national.slice(5)];
    else if(['KZ','RU','US'].includes(country)&&national.length===10)groups=[national.slice(0,3),national.slice(3,6),national.slice(6)];
    else if(country==='GB'&&national.length===10)groups=[national.slice(0,4),national.slice(4,7),national.slice(7)];
    else if(country==='GE'&&national.length===9)groups=[national.slice(0,3),national.slice(3,6),national.slice(6)];
    return groups?selected.code+' '+groups.join(' '):value;
  }
  function createAccountInformation(options){
    const doc=options.document;
    const find=id=>doc.getElementById(id);
    const page=find('personalInformationPage');
    const editor=find('personalInformationEditor');
    const form=find('personalInformationForm');
    const fields=find('personalInformationFields');
    const message=find('personalInformationMessage');
    const error=find('personalInformationError');
    const saveButton=find('personalInformationSave');
    const cancelButton=find('personalInformationCancel');
    const valueNodes=Array.from(page.querySelectorAll('[data-personal-value]'));
    const editButtons=Array.from(page.querySelectorAll('[data-personal-edit]'));
    let editingField=null,loaded=false,saving=false,generation=0,identity='',returnFocus=null;
    let previousOverflow='';
    const account=()=>options.getAccountData()||{};
    const telegram=()=>options.getTelegramUser()||{};
    const currentIdentity=()=>String(telegram().id||'');
    const displayName=data=>data.full_name||[data.first_name,data.last_name].filter(Boolean).join(' ')||data.username||'Telegram user';
    function showMessage(text,retry){
      message.textContent=text;
      find('personalInformationRetry').hidden=!retry;
    }
    function paint(){
      const data=account(),name=displayName(data),avatar=find('personalInformationAvatar');
      find('personalInformationName').textContent=name;
      find('personalInformationUsername').textContent=data.username?'@'+data.username:(currentIdentity()?'Без username':'Вход через Telegram');
      const active=String(data.account_status||'').toLowerCase()==='active';
      const status=find('personalInformationStatus');
      status.textContent=active?'● Активный аккаунт':(currentIdentity()?(data.account_status==='blocked'?'● Аккаунт заблокирован':'● Ожидает активации'):'Вход через Telegram');
      status.classList.toggle('inactive',!active);
      const photo=data.avatar_url||telegram().photo_url||'';
      avatar.textContent=(name.trim().slice(0,2)||'GA').toUpperCase();
      avatar.style.backgroundImage=photo?'url("'+String(photo).replace(/["\\]/g,'\\$&')+'")':'';
      avatar.classList.toggle('hasPhoto',!!photo);
      for(const node of valueNodes){
        const field=node.dataset.personalValue;
        let value=data[field]||'';
        if(field==='full_name')value=data.full_name||'';
        if(field==='phone'){
          const selected=phoneCountries.find(item=>item.country===data.phone_country);
          value=data.phone?(selected?selected.flag+' ':'')+formatPhone(data.phone,data.phone_country):'';
        }
        if(field==='residence_address')value=formatAddress(data.residence_address);
        if(field==='mailing_address')value=formatAddress(data.mailing_same_as_residence?data.residence_address:data.mailing_address);
        node.textContent=value||(field==='full_name'?'Не указано':'Не указан');
        node.classList.toggle('empty',!value);
        const button=editButtons.find(item=>item.dataset.personalEdit===field);
        if(button){
          button.textContent=value?'Редактировать':'Добавить';
          button.setAttribute('aria-label',(value?'Редактировать: ':'Добавить: ')+labels[field]);
        }
      }
    }
    function applyInformation(information){
      const merged={...account()};
      for(const key of editableFields)if(Object.hasOwn(information,key))merged[key]=information[key];
      options.setAccountData(merged);
      options.onSync?.();
      paint();
    }
    async function request(action,field,value){
      const initData=options.getInitData();
      if(!initData||!currentIdentity())throw Error('Откройте приложение через Telegram.');
      const response=await options.fetch('/api/account-information',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({initData,action,...(field?{field,value}:{})})
      });
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw Error(result.error||'Не удалось сохранить личную информацию.');
      if(!result.information||typeof result.information!=='object')throw Error('Сервер вернул неполные данные. Попробуйте обновить.');
      return result.information;
    }
    async function load(settings={}){
      if(saving)return null;
      const version=++generation,requestedIdentity=currentIdentity();
      if(identity!==requestedIdentity){loaded=false;identity=requestedIdentity;}
      if(!settings.silent)showMessage('Загрузка личной информации…',false);
      try{
        if(options.ready)await options.ready();
        const information=await request('read');
        if(version!==generation||requestedIdentity!==currentIdentity())return null;
        loaded=true;
        applyInformation(information);
        showMessage('',false);
        return information;
      }catch(problem){
        if(version===generation&&requestedIdentity===currentIdentity()){
          showMessage(problem.message||'Не удалось загрузить данные.',true);
          paint();
        }
        return null;
      }
    }
    async function open(){
      const wasHidden=page.hidden;
      page.hidden=false;
      page.setAttribute('aria-hidden','false');
      if(doc.body){if(wasHidden)previousOverflow=doc.body.style.overflow;doc.body.style.overflow='hidden';}
      options.onOpen?.();
      page.classList.add('open');
      paint();
      showMessage('Загрузка личной информации…',false);
      try{
        if(options.ready)await options.ready();
        if(options.beforeLoad)await options.beforeLoad();
      }catch(problem){
        showMessage(problem.message||'Не удалось загрузить аккаунт.',true);
        return null;
      }
      return load();
    }
    function close(){
      if(saving)return false;
      cancel();
      page.classList.remove('open');
      page.hidden=true;
      page.setAttribute('aria-hidden','true');
      if(doc.body)doc.body.style.overflow=previousOverflow;
      options.onClose?.();
      return true;
    }
    function element(tag,text){
      const node=doc.createElement(tag);
      if(text!==undefined)node.textContent=text;
      return node;
    }
    function addInput(parent,key,label,value,settings={}){
      const wrapper=element('div');
      wrapper.className='personalInformationField';
      const caption=element('label',label);
      caption.htmlFor='personalInput_'+key;
      const input=element('input');
      input.id=caption.htmlFor;
      input.name=key;
      input.type=settings.type||'text';
      input.value=String(value||'');
      input.maxLength=settings.maxLength||100;
      if(settings.autocomplete)input.autocomplete=settings.autocomplete;
      if(settings.inputMode)input.inputMode=settings.inputMode;
      if(settings.placeholder)input.placeholder=settings.placeholder;
      wrapper.appendChild(caption);
      wrapper.appendChild(input);
      parent.appendChild(wrapper);
      return input;
    }
    function addAddress(parent,prefix,address){
      const data=address||{};
      addInput(parent,prefix+'_country','Страна',data.country,{autocomplete:'country-name'});
      addInput(parent,prefix+'_city','Город',data.city,{autocomplete:'address-level2'});
      addInput(parent,prefix+'_region','Регион / область (необязательно)',data.region,{autocomplete:'address-level1'});
      addInput(parent,prefix+'_street','Адрес / улица',data.street,{maxLength:300,autocomplete:'street-address'});
    }
    function edit(field){
      if(!Object.hasOwn(labels,field)||saving)return false;
      if(!currentIdentity()||!options.getInitData()){
        showMessage('Откройте приложение через Telegram.',false);
        return false;
      }
      if(!loaded||identity!==currentIdentity()){
        showMessage('Сначала обновите личную информацию.',true);
        return false;
      }
      editingField=field;
      returnFocus=editButtons.find(button=>button.dataset.personalEdit===field);
      error.textContent='';
      fields.replaceChildren();
      find('personalInformationEditorTitle').textContent=labels[field];
      const data=account();
      if(field==='email')addInput(fields,'email','Email',data.email,{type:'email',maxLength:254,autocomplete:'email',inputMode:'email',placeholder:'user@example.com'});
      if(field==='full_name')addInput(fields,'full_name','Полное имя',data.full_name,{maxLength:160,autocomplete:'name'});
      if(field==='postal_code')addInput(fields,'postal_code','Почтовый индекс',data.postal_code,{maxLength:32,autocomplete:'postal-code'});
      if(field==='phone'){
        const wrapper=element('div');
        wrapper.className='personalInformationField';
        const label=element('label','Страна / телефонный код');
        label.htmlFor='personalInput_phone_country';
        const select=element('select');
        select.id=label.htmlFor;
        select.name='phone_country';
        for(const item of phoneCountries){
          const option=element('option',item.flag+' '+item.label+' '+item.code);
          option.value=item.country;
          select.appendChild(option);
        }
        select.value=phoneCountries.some(item=>item.country===data.phone_country)?data.phone_country:'AE';
        wrapper.appendChild(label);
        wrapper.appendChild(select);
        fields.appendChild(wrapper);
        const selected=phoneCountries.find(item=>item.country===select.value);
        const number=String(data.phone||'');
        addInput(fields,'phone','Номер телефона',number.startsWith(selected.code)?number.slice(selected.code.length):number,{type:'tel',inputMode:'tel',maxLength:32,autocomplete:'tel-national',placeholder:'50 123 4567'});
        const hint=element('p','Выберите страну и введите номер. Код страны добавится при сохранении.');
        hint.className='personalInformationFieldHint';
        fields.appendChild(hint);
      }
      if(field==='residence_address')addAddress(fields,'residence',data.residence_address);
      if(field==='mailing_address'){
        const label=element('label');
        label.className='personalInformationSameAddress';
        const checkbox=element('input');
        checkbox.id='personalInput_mailing_same';
        checkbox.type='checkbox';
        checkbox.checked=!!data.mailing_same_as_residence;
        label.appendChild(checkbox);
        label.appendChild(element('span','Совпадает с адресом проживания'));
        fields.appendChild(label);
        const separate=element('div');
        separate.id='personalInformationMailingFields';
        addAddress(separate,'mailing',data.mailing_address);
        separate.hidden=checkbox.checked;
        checkbox.addEventListener('change',()=>{separate.hidden=checkbox.checked;});
        fields.appendChild(separate);
      }
      editor.hidden=false;
      editor.setAttribute('aria-hidden','false');
      const inputs=Array.from(fields.querySelectorAll('input,select'));
      const first=inputs.find(input=>input.tagName==='INPUT'&&input.type!=='checkbox'&&!input.closest?.('[hidden]'))||inputs.find(input=>!input.closest?.('[hidden]'));
      first?.focus();
      return true;
    }
    function cancel(){
      if(saving)return false;
      editor.hidden=true;
      editor.setAttribute('aria-hidden','true');
      error.textContent='';
      editingField=null;
      returnFocus?.focus();
      returnFocus=null;
      return true;
    }
    function inputValue(key){return String(find('personalInput_'+key)?.value||'').trim();}
    function addressValue(prefix){
      const value={country:inputValue(prefix+'_country'),region:inputValue(prefix+'_region'),city:inputValue(prefix+'_city'),street:inputValue(prefix+'_street')};
      if(Object.values(value).some(Boolean)&&(!value.country||!value.city||!value.street))throw Error('Укажите страну, город и адрес / улицу.');
      return value;
    }
    function valueFor(field){
      if(field==='phone')return {number:inputValue('phone'),country:inputValue('phone_country')};
      if(field==='residence_address')return addressValue('residence');
      if(field==='mailing_address'){
        const same=!!find('personalInput_mailing_same')?.checked;
        if(same&&!formatAddress(account().residence_address))throw Error('Сначала добавьте адрес проживания.');
        return {same_as_residence:same,address:same?null:addressValue('mailing')};
      }
      const value=inputValue(field);
      if(field==='email'&&value&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))throw Error('Введите корректный email.');
      return value;
    }
    async function save(){
      if(!editingField||saving)return false;
      error.textContent='';
      const field=editingField,requestedIdentity=currentIdentity();
      let value;
      try{value=valueFor(field);}catch(problem){error.textContent=problem.message;return false;}
      if(form.checkValidity&&!form.checkValidity()){form.reportValidity?.();return false;}
      saving=true;
      saveButton.disabled=true;
      cancelButton.disabled=true;
      saveButton.textContent='Сохранение…';
      ++generation;
      try{
        const information=await request('update',field,value);
        if(requestedIdentity!==currentIdentity())throw Error('Аккаунт изменился. Откройте личную информацию заново.');
        applyInformation(information);
        loaded=true;
        showMessage('',false);
        saving=false;
        cancel();
        return true;
      }catch(problem){
        error.textContent=problem.message||'Не удалось сохранить. Попробуйте ещё раз.';
        return false;
      }finally{
        saving=false;
        saveButton.disabled=false;
        cancelButton.disabled=false;
        saveButton.textContent='Сохранить';
      }
    }
    find('personalInformationBack').addEventListener('click',close);
    find('personalInformationRetry').addEventListener('click',()=>{void load();});
    cancelButton.addEventListener('click',cancel);
    form.addEventListener('submit',event=>{event.preventDefault();void save();});
    for(const button of editButtons)button.addEventListener('click',()=>edit(button.dataset.personalEdit));
    editor.addEventListener('click',event=>{if(event.target===editor)cancel();});
    editor.addEventListener('keydown',event=>{
      if(event.key==='Escape'){event.preventDefault();cancel();}
      if(event.key==='Tab'){
        const focusable=Array.from(editor.querySelectorAll('input,select,button')).filter(node=>!node.disabled&&!node.closest?.('[hidden]'));
        const first=focusable[0],last=focusable[focusable.length-1];
        if(event.shiftKey&&doc.activeElement===first){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&doc.activeElement===last){event.preventDefault();first?.focus();}
      }
    });
    paint();
    return {open,close,load,edit,cancel,save};
  }
  return {createAccountInformation,formatPhone,formatAddress,phoneCountries};
});

(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.GalaxySchedule=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const TIME_ZONE='Asia/Dubai';
  function nextAuctionTime(value=new Date()){
    const date=value instanceof Date?value:new Date(value);
    if(!Number.isFinite(date.getTime()))throw new TypeError('Invalid auction time');
    const next=new Date(date);next.setUTCMinutes(0,0,0);next.setUTCHours(next.getUTCHours()+1);return next;
  }
  function pluralizeLots(count){
    const n=Math.abs(Math.trunc(Number(count)||0)),a=n%100,b=n%10;
    return `${n} ${a>=11&&a<=14?'лотов':b===1?'лот':b>=2&&b<=4?'лота':'лотов'}`;
  }
  function dateKey(value){
    const p=new Intl.DateTimeFormat('en-CA',{timeZone:TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(value),get=t=>p.find(x=>x.type===t)?.value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  }
  function formatAuctionTime(value,now=new Date()){
    const auction=value instanceof Date?value:new Date(value),current=now instanceof Date?now:new Date(now);
    if(!Number.isFinite(auction.getTime())||!Number.isFinite(current.getTime()))return 'Аукцион';
    const key=dateKey(auction),today=dateKey(current),tomorrow=dateKey(new Date(current.getTime()+86400000));
    const prefix=key===today?'Сегодня · ':key===tomorrow?'Завтра · ':'';
    const date=new Intl.DateTimeFormat('ru-RU',{timeZone:TIME_ZONE,day:'numeric',month:'long'}).format(auction);
    const time=new Intl.DateTimeFormat('ru-RU',{timeZone:TIME_ZONE,hour:'2-digit',minute:'2-digit',hour12:false}).format(auction);
    return `${prefix}${date} · ${time}`;
  }
  return{TIME_ZONE,nextAuctionTime,pluralizeLots,formatAuctionTime,dateKey};
});

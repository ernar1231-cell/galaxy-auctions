const whiteGavel="<svg class=\"uiIcon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"m14 3 7 7-3 3-7-7zM9 8l7 7-3 3-7-7zM11 15l-7 7M14 21h8\"/></svg>";

const SUPABASE_URL="https://exfxcgiuotraszeqefha.supabase.co";
const SUPABASE_KEY="sb_publishable_aOURBE3lNYEUwY011Y5GIQ_kF7oGO-5";
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const tg=window.Telegram?.WebApp || null;
if(tg){ tg.ready(); tg.expand(); }
const tgUser=tg?.initDataUnsafe?.user || null;

async function registerTelegramUser(){
  if(!tgUser?.id) return null;
  try{
    const payload={
      p_telegram_id:String(tgUser.id),
      p_username:tgUser.username || null,
      p_first_name:tgUser.first_name || null,
      p_last_name:tgUser.last_name || null,
      p_country:null
    };
    const {data,error}=await db.rpc("register_telegram_user",payload);
    if(error) throw error;
    window.mkAuctionUser=data || null;
    return data;
  }catch(err){
    console.error("Telegram user registration failed",err);
    return null;
  }
}

const registrationReady=registerTelegramUser();
let registeredTotal=0, registeredTodayCount=0;
async function refreshRegisteredCount(){
  try{
    const start=new Date(); start.setHours(0,0,0,0);
    const [allRes,todayRes]=await Promise.all([
      db.from("auction_users").select("telegram_id",{count:"exact",head:true}),
      db.from("auction_users").select("telegram_id",{count:"exact",head:true}).gte("created_at",start.toISOString())
    ]);
    if(allRes.error) throw allRes.error;
    registeredTotal=Number(allRes.count||0);
    registeredTodayCount=todayRes.error?0:Number(todayRes.count||0);
    const c=$("registeredCount"); if(c)c.textContent=registeredTotal.toLocaleString("en-US");
    const la=$("liveAudience"); if(la)la.textContent=`👥 ${registeredTotal} ${registeredTotal===1?'участник':(registeredTotal>=2&&registeredTotal<=4?'участника':'участников')}`;
    const t=$("registeredToday"); if(t)t.textContent=`сегодня +${registeredTodayCount}`;
    const pt=$("registeredTotalProfile"); if(pt)pt.textContent=registeredTotal.toLocaleString("en-US");
    const ptd=$("registeredTodayProfile"); if(ptd)ptd.textContent=`Сегодня: +${registeredTodayCount}`;
  }catch(e){console.warn("Registered users count failed",e);}
}
registrationReady.then(()=>refreshRegisteredCount());
setInterval(refreshRegisteredCount,10000);
let selectedCountry="Dubai";
let realtimeChannel=null;
let stateChannel=null;
let stateRow=null;
let serverClockOffsetMs=0;
let lastSnapshotAt=0;
let stateBusy=false;
const lots=[
{no:"001",title:"Mercedes-Benz G63 AMG 2025",price:75000,meta:["10,500 km","Petrol","Automatic","4WD"],photos:["images/lot1-1.webp","images/lot1-2.webp","images/lot1-3.webp","images/lot1-4.webp"],details:[["Specs","Japanese Specs"],["Engine","4.0L V8"],["Interior","Red"],["Exterior","Black"],["Steering","Left Hand"],["Seats","5"],["Warranty","Yes"]]},
{no:"002",title:"BMW X7 xDrive40i 2020",price:15000,meta:["101,000 km","Petrol","Automatic","AWD"],photos:["images/lot2-1.webp","images/lot2-2.webp","images/lot2-3.webp","images/lot2-4.webp"],details:[["Specs","GCC Specs"],["Engine","3.0L / 6 cyl."],["Interior","Brown"],["Exterior","Black"],["Steering","Left Hand"],["Seats","7"],["Body","SUV"]]},
{no:"003",title:"Hyundai Palisade Calligraphy 2026",price:17000,meta:["0 km","Petrol","Automatic","SUV"],photos:["images/lot3-1.webp","images/lot3-2.webp","images/lot3-3.webp","images/lot3-4.webp"],details:[["Specs","GCC Specs"],["Engine","3.5–3.9L / V6"],["Interior","Tan"],["Exterior","Black"],["Steering","Left Hand"],["Seats","7"],["Trim","Calligraphy"]]},
{no:"004",title:"Toyota Camry Limited 2026 Hybrid",price:10000,meta:["0 km","Hybrid","Automatic","Sedan"],photos:["images/lot4-1.webp","images/lot4-2.webp","images/lot4-3.webp","images/lot4-4.webp"],details:[["Specs","GCC Specs"],["Engine","4 cyl. Hybrid"],["Interior","Tan"],["Exterior","Grey"],["Steering","Left Hand"],["Seats","5"],["Trim","Limited"]]},
{no:"005",title:"Mercedes-Benz G63 AMG 2021",price:20000,meta:["203,634 km","Gasoline","Automatic","AWD"],photos:["images/lot5-1.jpeg","images/lot5-2.jpeg","images/lot5-3.jpeg","images/lot5-4.jpeg"],details:[["Engine","4.0L V8"],["Exterior","Black"],["Start code","Run and Drive"],["Key","Present"],["Primary damage","Mechanical"],["Secondary damage","Front end"],["Sale document","Certificate of title (FL)"]]},
{no:"006",title:"Toyota Camry LE 2022",price:2500,meta:["450,000 km","Hybrid","Automatic","Sedan"],photos:["images/lot6-1.webp","images/lot6-2.webp"],details:[["Specs","GCC Specs"],["Trim","LE"],["Engine","4 cyl. Hybrid"],["Interior","Black"],["Exterior","White"],["Steering","Left Hand"],["Seats","5"]]},
{no:"007",title:"BMW X5 xDrive40i M Sport 2023",price:7000,meta:["45,607 km","Petrol","Automatic","SUV"],photos:["images/lot7-1.jpeg","images/lot7-2.jpeg","images/lot7-3.jpeg","images/lot7-4.jpeg"],details:[["Specs","GCC Specs"],["Engine","3.0–3.5L / 6 cyl."],["Interior","Black"],["Exterior","White"],["Steering","Left Hand"],["Seats","5"],["Warranty","Yes"]]},
{no:"008",title:"Toyota Land Cruiser VXR Grand Touring 2018",price:13000,meta:["107,250 km","Petrol","Automatic","SUV"],photos:["images/lot8-1.webp","images/lot8-2.webp","images/lot8-3.webp","images/lot8-4.webp"],details:[["Specs","GCC Specs"],["Engine","4000+ cc / V8"],["Interior","Maroon"],["Exterior","White"],["Steering","Left Hand"],["Seats","7"],["Trim","VXR Grand Touring"]]},
{no:"009",title:"Toyota Land Cruiser GXR 2018",price:5000,meta:["135,000 km","Petrol","Automatic","SUV"],photos:["images/lot9-1.webp"],details:[["Specs","GCC Specs"],["Engine","6 cyl."],["Interior","Beige"],["Exterior","Silver"],["Steering","Left Hand"],["Seats","7"],["Warranty","No"]]},
{no:"010",title:"BMW X5 xDrive50i M Sport 2022",price:3000,meta:["97,595 km","Petrol","Automatic","SUV"],photos:["images/lot10-1.jpeg"],details:[["Specs","GCC Specs"],["Engine","4000+ cc / V8"],["Power","500–599 HP"],["Interior","Brown"],["Exterior","Black"],["Steering","Left Hand"],["Seats","5"],["Warranty","Yes"]]},
{no:"011",title:"Toyota Land Cruiser Adventure 2025",price:15,meta:["28,687 km","Petrol","Automatic","SUV"],photos:["images/lot11-1.jpeg"],details:[["Specs","GCC Specs"],["Engine","4 cyl."],["Power","200–299 HP"],["Interior","Brown"],["Exterior","White"],["Steering","Left Hand"],["Warranty","Yes"]]},
{no:"012",title:"Toyota Land Cruiser GXR 2018",price:10,meta:["55,000 km","Diesel","Automatic","SUV"],photos:["images/lot12-1.webp","images/lot12-2.webp"],details:[["Specs","GCC Specs"],["Engine","4000+ cc / V8"],["Power","300–399 HP"],["Interior","Beige"],["Exterior","Black"],["Steering","Left Hand"],["Seats","7"]]},
{no:"013",title:"Lamborghini Urus Mansory Edition 2020",price:120000,meta:["52,000 km","Petrol","Automatic","SUV"],photos:["images/lot13-1.webp","images/lot13-2.webp","images/lot13-3.webp"],details:[["Specs","GCC Specs"],["Engine","4000+ cc / V8"],["Power","600–699 HP"],["Steering","Left Hand"],["Seats","4"],["Trim","Mansory Edition"]]},
{no:"014",title:"Lamborghini Huracan EVO Spyder 2023",price:145000,meta:["4,005 km","Petrol","Automatic","Convertible"],photos:["images/lot14-1.webp","images/lot14-2.webp"],details:[["Specs","GCC Specs"],["Engine","4000+ cc / V10"],["Power","600–699 HP"],["Interior","Black"],["Exterior","Yellow"],["Steering","Left Hand"],["Seats","2"]]},
{no:"015",title:"Lamborghini Huracan EVO Coupe 2021",price:250000,meta:["14,563 km","Petrol","Automatic","Coupe"],photos:["images/lot15-1.webp"],details:[["Specs","GCC Specs"],["Engine","4000+ cc / V10"],["Power","600–699 HP"],["Interior","Black"],["Exterior","Red"],["Steering","Left Hand"],["Seats","2"]]},
]
let managedLotStatuses={};let liveTodayQueue=[];let galaxyStartAt=null;
let i=0,seconds=10,phase="red",price=lots[0].price,inc=1000,soundOn=false,audioCtx=null,timerId=null,bidder=318,closed=false;
const LOT_SECONDS=10, BONUS_SECONDS=10, SOLD_SECONDS=2, WAIT_SECONDS=600;
let lastPhaseAudioKey="";
const $=x=>document.getElementById(x), money=n=>"$"+n.toLocaleString("en-US");
function ctx(){if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==="suspended")audioCtx.resume()}
function tone(freq,dur,type="sine",vol=.04,delay=0){if(!soundOn||!audioCtx)return;let o=audioCtx.createOscillator(),g=audioCtx.createGain(),t=audioCtx.currentTime+delay;o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(g);g.connect(audioCtx.destination);o.start(t);o.stop(t+dur)}
function drum(strong=false){if(!soundOn||!audioCtx)return;let t=audioCtx.currentTime,len=Math.floor(audioCtx.sampleRate*.11),b=audioCtx.createBuffer(1,len,audioCtx.sampleRate),d=b.getChannelData(0);for(let j=0;j<len;j++)d[j]=(Math.random()*2-1)*Math.exp(-j/(len*.16));let s=audioCtx.createBufferSource(),f=audioCtx.createBiquadFilter(),g=audioCtx.createGain();s.buffer=b;f.type="lowpass";f.frequency.value=strong?520:320;g.gain.setValueAtTime(strong?.28:.14,t);g.gain.exponentialRampToValueAtTime(.001,t+.11);s.connect(f);f.connect(g);g.connect(audioCtx.destination);s.start(t)}
function tick(){}
function bidSound(){drum(true);tone(760,.06,"square",.06,.01);tone(980,.07,"triangle",.07,.08);tone(1240,.08,"sine",.06,.16)}
function soldSound(){drum(true);tone(392,.10,"triangle",.09,.03);tone(523,.12,"triangle",.10,.15);tone(659,.14,"triangle",.10,.29);tone(784,.30,"sine",.11,.44)}
function bidderInitials(name){
 const clean=String(name||"?").replace(/^@/,"").trim();
 const parts=clean.split(/[\s_.-]+/).filter(Boolean);
 return (parts.length>1?(parts[0][0]+parts[1][0]):clean.slice(0,2)).toUpperCase();
}
function renderRecentBidders(rows){
 const bids=(rows||[]).slice(0,4);
 const markup=bids.map((b,idx)=>{
  const name=String(b.username||b.user_id||"Guest");
  const safe=name.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const amount=Number(b.amount||0);
  const leader=idx===0;
  return `<div class="liveBidder ${leader?'leader':''}"><span class="liveName">${safe}</span><span class="liveAmount">${money(amount)}</span></div>`;
 }).join("");
 const feed=$("liveBidFeed");if(feed)feed.innerHTML=markup;
 $("recentBidders").innerHTML=bids.map(b=>{
  const name=String(b.username||b.user_id||"Guest");
  const safe=name.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const amount=Number(b.amount||0);
  const tm=b.created_at?new Date(b.created_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit",second:"2-digit"}):"";
  return `<div class="recentBidder"><span class="recentBidderName">${safe}</span><span class="recentBidderAmount">${money(amount)}</span><span class="recentBidderTime">${tm}</span></div>`;
 }).join("");
}
let latestLeaderUserId=null;
let bidAcceptedUntil=0;
let userHasBidThisLot=false;
let myLatestBidAmount=null;
let whitePhotoLot=null;
let whiteBidTab="active";
let whiteMyRows=[];
async function syncRecentBidders(){
 try{
  const lotId=Number(lots[i].no);
  const {data,error}=await db.from("auction_bids").select("user_id,username,country,amount,created_at,id").eq("lot_id",lotId).order("id",{ascending:false}).limit(4);
  if(error)throw error;
  renderRecentBidders(data);
  latestLeaderUserId=data?.[0]?.user_id?String(data[0].user_id):null;
  if(tgUser?.id){
    const {data:mine}=await db.from("auction_bids").select("id,amount").eq("lot_id",lotId).eq("user_id",String(tgUser.id)).order("id",{ascending:false}).limit(1);
    userHasBidThisLot=!!(mine&&mine.length);myLatestBidAmount=userHasBidThisLot?Number(mine[0].amount):null;
  }else {userHasBidThisLot=false;myLatestBidAmount=null;}
  updateBidVisualState();
 }catch(e){console.warn("Recent bids",e.message)}
}
async function syncLatestBid(){
 try{
  const lotId=Number(lots[i].no);
  const {data,error}=await db.from("auction_bids").select("amount,user_id,username,country,created_at").eq("lot_id",lotId).order("created_at",{ascending:false}).limit(1);
  if(error) throw error;
  if(data&&data[0]){price=Number(data[0].amount); bidder=data[0].username||data[0].user_id||"LIVE"; update();}
 }catch(e){console.warn("Supabase read",e.message)}
}
function subscribeLot(){
 if(realtimeChannel) db.removeChannel(realtimeChannel);
 const lotId=Number(lots[i].no);
 realtimeChannel=db.channel("auction_bids_"+lotId).on("postgres_changes",{event:"INSERT",schema:"public",table:"auction_bids",filter:`lot_id=eq.${lotId}`},payload=>{
  const b=payload.new; bidder=b.username||b.user_id||"LIVE"; price=Number(b.amount||price); latestLeaderUserId=b.user_id?String(b.user_id):null; syncRecentBidders(); fetchAuctionState();
 }).subscribe();
}
async function fetchAuctionState(){
 try{
  const {data,error}=await db.from("auction_state").select("*").eq("id",1).single();
  if(error) throw error;
  applyAuctionState(data,true);
 }catch(e){console.warn("Auction state read",e.message)}
}
function normalizedPhotos(l){const seen=new Set();return [...(l.images||[]).sort((a,b)=>(Number(a.sort_order)||0)-(Number(b.sort_order)||0)).map(x=>x?.image_url),l.primary_image].filter(u=>{u=String(u||'').trim();if(!u||seen.has(u))return false;seen.add(u);return true;});}
function upsertServerLot(l){if(!l)return;const no=String(l.lot_number).padStart(3,'0'),photos=normalizedPhotos(l);const sourceDetails=[["Mileage",l.mileage==null?null:`${Number(l.mileage).toLocaleString()} km`],["Engine",l.engine],["Fuel",l.fuel],["Transmission",l.transmission],["Drive",l.drive],["Interior",l.interior_color],["Exterior",l.exterior_color],["VIN",l.vin],["Auction location",l.auction_location||l.auction_yard||l.location],["Estimated retail value",l.estimated_retail_value==null?null:money(Number(l.estimated_retail_value))],["Primary damage",l.primary_damage],["Specs",l.specs],["Seats",l.seats]];const q={id:l.id,no,title:[l.make,l.model,l.year].filter(Boolean).join(' '),price:Number(l.starting_bid||0),meta:[l.mileage==null?'—':`${Number(l.mileage).toLocaleString()} km`,l.fuel||'—',l.transmission||'—',l.drive||'—'],photos,details:sourceDetails.filter(d=>d[1]!==null&&d[1]!==undefined&&String(d[1]).trim()!=='')};const idx=lots.findIndex(x=>String(x.id||'')===String(l.id||'')||Number(x.no)===Number(l.lot_number));if(idx>=0){if(!q.photos.length)q.photos=lots[idx].photos;if(q.meta.every(v=>v==='—'||v==='0 km'))q.meta=lots[idx].meta;lots[idx]={...lots[idx],...q};}else lots.push(q);}
function applyAuctionState(row,forceRender=false){
 if(!row)return;
 const incomingAudioKey=String(row.lot_id||1)+"|"+String(row.phase||"red")+"|"+String(row.phase_started_at||"");
 const shouldRestartAudio=incomingAudioKey!==lastPhaseAudioKey;
 stateRow=row;
 const requestedLot=Number(row.lot_id||1);
 if(!lots.some(x=>Number(x.no)===requestedLot)){fetch('/api/live-sync?t='+Date.now(),{cache:'no-store'}).then(r=>r.ok?r.json():null).then(s=>{if(s?.lot){upsertServerLot(s.lot);applyAuctionState(s.state||row,true)}}).catch(()=>{});return;}
 const nextIndex=Math.max(0,lots.findIndex(x=>Number(x.no)===requestedLot));
 const lotChanged=nextIndex!==i;
 i=nextIndex;
 price=Number(row.current_bid ?? lots[i].price);
 phase=row.phase||"red";
 closed=row.status==="waiting";
 if(lotChanged||forceRender) render(false);
 syncRecentBidders();
 if(shouldRestartAudio && row.status!=="waiting"){ lastPhaseAudioKey=incomingAudioKey; restartPhaseAudio(); }
 updateFromClock();
}
function subscribeAuctionState(){
 if(stateChannel) db.removeChannel(stateChannel);
 stateChannel=db.channel("auction_state_live").on("postgres_changes",{event:"*",schema:"public",table:"auction_state",filter:"id=eq.1"},payload=>{
  if(payload.new) applyAuctionState(payload.new);
 }).subscribe();
}
function serverNowMs(){return Date.now()+serverClockOffsetMs;}
function syncServerClock(serverNow,requestStarted){
 const t=Date.parse(serverNow||'');if(!Number.isFinite(t))return;
 const midpoint=(Number(requestStarted)||Date.now())+(Date.now()-(Number(requestStarted)||Date.now()))/2;
 const sample=t-midpoint;
 serverClockOffsetMs=serverClockOffsetMs?serverClockOffsetMs*.7+sample*.3:sample;
}
function elapsedSeconds(){
 if(!stateRow?.phase_started_at)return 0;
 return Math.max(0,(serverNowMs()-new Date(stateRow.phase_started_at).getTime())/1000);
}
async function writeState(patch){
 if(stateBusy)return;
 stateBusy=true;
 try{
  const {data,error}=await db.from("auction_state").update({...patch,updated_at:new Date().toISOString()}).eq("id",1).select().single();
  if(error)throw error;
  applyAuctionState(data);
 }catch(e){console.warn("Auction state update",e.message)}
 finally{stateBusy=false}
}
let bidSubmitting=false;
async function submitBid(){
 if(closed||bidSubmitting)return; ctx();
 if(!tgUser?.id || !tg?.initData){alert("Откройте Galaxy Auctions через Telegram для участия в торгах.");return;}
 const lotId=Number(lots[i]?.no||0);
 bidSubmitting=true;
 const btn=$("bid"); btn.disabled=true; btn.textContent="Проверка…";
 try{
   const requestStarted=Date.now();
   const res=await fetch("/api/place-bid",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({initData:tg.initData,lotId,increment:inc,country:selectedCountry})});
   const out=await res.json().catch(()=>({}));
   if(out.serverNow) syncServerClock(out.serverNow,requestStarted);
   if(!res.ok){
     if(out.code==="DEPOSIT_REQUIRED") alert("Для участия администратор должен активировать депозит и лимит ставок.");
     else if(out.code==="LIMIT_EXCEEDED") alert(`Лимит ставки превышен. Ваш лимит: ${money(Number(out.bidLimit||0))}`);
     else if(out.code==="BLOCKED") alert("Ваш аккаунт заблокирован для участия в торгах.");
     else alert(out.error||"Ставка не принята.");
     await fetchAuctionState(); return;
   }
   bidder=out.bid?.username||tgUser.username||"Bidder"; price=Number(out.state?.current_bid||out.bid?.amount||price);
   // Apply the authoritative bid response immediately. This resets the 10-second ring
   // on the same frame instead of waiting for the realtime/follow-up state fetch.
   if(out.state) applyAuctionState(out.state,true);
   bidAcceptedUntil=Date.now()+850;
   if(soundOn){const bs=$("bidAudio");bs.currentTime=0;bs.play().catch(()=>{});}
   await fetchAuctionState(); await syncRecentBidders();
 }catch(e){console.error(e);alert("Не удалось отправить ставку. Проверьте соединение.");await fetchAuctionState();}
 finally{bidSubmitting=false;btn.disabled=closed;update();}
}

function watchKey(){return "mkWatchlist:"+(tgUser?.id||"guest");}
function getWatchlist(){try{return JSON.parse(localStorage.getItem(watchKey())||"[]").map(Number)}catch(e){return []}}
function saveWatchlist(v){localStorage.setItem(watchKey(),JSON.stringify([...new Set(v.map(Number))]));renderWatchlist();renderCatalog();if($("myBidsScreen")?.classList.contains("open"))whiteRenderBidRows();}
function isFavorite(idx){return getWatchlist().includes(idx)}
function toggleFavorite(idx){let w=getWatchlist();w=w.includes(idx)?w.filter(x=>x!==idx):[...w,idx];saveWatchlist(w);if($("detailOverlay").classList.contains("open"))updateDetailFav(idx);}
function lotStatus(idx){const st=String(managedLotStatuses[String(Number(lots[idx]?.no))]||"").toLowerCase();if(st==="archived")return "ARCHIVED";if(st==="sold")return "SOLD";if(st==="live")return "🔴 LIVE";if(st==="draft")return "DRAFT";if(st==="upcoming")return "UPCOMING";return closed?"UPCOMING":(idx<i?"SOLD":idx===i?"🔴 LIVE":"UPCOMING")}
function auctionDateLabel(){return GalaxySchedule.formatAuctionTime(galaxyStartAt||GalaxySchedule.nextAuctionTime(serverNowMs()),new Date(serverNowMs()))}
function lotCountLabel(count){return GalaxySchedule.pluralizeLots(count)}
function renderCatalog(){
 const root=$("catalogList"); if(!root)return;
 const rows=liveTodayQueue.map(no=>{const idx=lots.findIndex(q=>Number(q.no)===Number(no));return idx<0?null:{q:lots[idx],idx};}).filter(x=>x&&String(managedLotStatuses[String(Number(x.q.no))]||"").toLowerCase()!=="archived"&&String(managedLotStatuses[String(Number(x.q.no))]||"").toLowerCase()!=="draft");
 const label=auctionDateLabel(),head=document.querySelector('#catalogOverlay .sheetHead b'); if(head)head.textContent=`ЛОТЫ (${rows.length}) · ${label}`;
 root.innerHTML=rows.map(({q,idx},pos)=>`<div class="catalogItem" data-open-lot="${idx}">${q.photos[0]?`<img src="${whiteEscape(q.photos[0])}" alt="${whiteEscape(q.title)}">`:''}<div><b>${label}</b><small>${whiteEscape(q.title)}</small><small>Позиция ${pos+1} из ${rows.length} • ${whiteEscape(q.meta[0])} • ${whiteEscape(q.meta[1])} • <strong>${lotStatus(idx)}</strong></small></div><div class="catalogActions"><button class="starBtn ${isFavorite(idx)?'on':''}" data-star="${idx}" aria-label="Избранное">${isFavorite(idx)?'★':'☆'}</button><button class="catalogShareBtn" data-share-lot="${idx}" aria-label="Поделиться">⇧</button></div></div>`).join("")||'<div class="emptyWatch">Предстоящих лотов пока нет.</div>';
 root.querySelectorAll('[data-star]').forEach(b=>b.onclick=e=>{e.stopPropagation();toggleFavorite(Number(b.dataset.star))});
 root.querySelectorAll('[data-share-lot]').forEach(b=>b.onclick=e=>{e.stopPropagation();shareLot(Number(b.dataset.shareLot))});
 root.querySelectorAll('[data-open-lot]').forEach(el=>el.onclick=()=>openLotDetail(Number(el.dataset.openLot)));
}
function renderWatchlist(){
 const root=$("queueList"); if(!root)return; const w=getWatchlist();
 if(!w.length){root.innerHTML='<div class="emptyWatch">☆ Пока нет избранных лотов.<br><small>Открой список лотов и нажми звёздочку.</small></div>';return;}
 root.innerHTML=w.filter(idx=>lots[idx]&&String(managedLotStatuses[String(Number(lots[idx].no))]||"").toLowerCase()!=="archived").map(idx=>{const q=lots[idx];return `<div class="queueItem" data-watch-open="${idx}"><img src="${q.photos[0]}"><div><b>${q.title}</b><small>${q.meta[0]} • ${q.meta[1]}</small><small>Starting bid ${money(q.price)} • <strong>${lotStatus(idx)}</strong></small></div><button class="queueStar" data-watch-remove="${idx}">★</button></div>`}).join("");
 root.querySelectorAll('[data-watch-remove]').forEach(b=>b.onclick=e=>{e.stopPropagation();toggleFavorite(Number(b.dataset.watchRemove))});
 root.querySelectorAll('[data-watch-open]').forEach(el=>el.onclick=()=>openLotDetail(Number(el.dataset.watchOpen)));
}
let detailIndex=0;
let currentPhotoIndex=0;
function setLivePhoto(idx){
 const x=lots[i];if(!x?.photos?.length){$('photo').removeAttribute('src');$('photo').style.display='none';$('heroCounter').hidden=true;$('photoPrev').hidden=$('photoNext').hidden=true;return;}
 $('photo').style.display='block';$('heroCounter').hidden=false;
 currentPhotoIndex=((idx%x.photos.length)+x.photos.length)%x.photos.length;
 $("photo").src=x.photos[currentPhotoIndex];$("photo").alt=x.title+' — фото '+(currentPhotoIndex+1);
 $("heroCounter").textContent=`${currentPhotoIndex+1}/${x.photos.length}`;
 $("photoPrev").hidden=$("photoNext").hidden=x.photos.length<2;
}
function attachHeroSwipe(){
 const hero=$("photo");
 if(!hero||hero.dataset.swipeBound==="1") return;
 hero.dataset.swipeBound="1";
 hero.style.touchAction="pan-y pinch-zoom";
 let sx=0,sy=0;
 hero.addEventListener("touchstart",e=>{const t=e.changedTouches[0]; sx=t.clientX; sy=t.clientY;},{passive:true});
 hero.addEventListener("touchend",e=>{const t=e.changedTouches[0]; const dx=t.clientX-sx, dy=t.clientY-sy; if(Math.abs(dx)>32 && Math.abs(dx)>Math.abs(dy)){ setLivePhoto(dx<0?currentPhotoIndex+1:currentPhotoIndex-1); }},{passive:true});
}
function ensureHeroCounter(){ /* Counter is anchored to photoFrame in the HTML. */ }

const vehicleLabels={Mileage:'Пробег',Engine:'Двигатель',Fuel:'Топливо',Transmission:'Трансмиссия',Drive:'Привод',Interior:'Салон',Exterior:'Цвет',VIN:'VIN','Auction location':'Площадка аукциона','Estimated retail value':'Ожидаемая стоимость','Primary damage':'Основной ущерб',Specs:'Спецификация',Seats:'Места'};
function completeVehicleDetails(q){const present=new Set((q.details||[]).map(x=>x[0])),fromMeta=[['Mileage',q.meta?.[0]],['Fuel',q.meta?.[1]],['Transmission',q.meta?.[2]],['Drive',q.meta?.[3]]];return [...fromMeta.filter(x=>!present.has(x[0])&&x[1]&&x[1]!=='—'),...(q.details||[])];}
function detailCountdown(){if(stateRow?.status==='waiting'&&galaxyStartAt)return galaxyFormatCountdown(new Date(galaxyStartAt).getTime()-serverNowMs());return closed?'Завершено':whiteTime(seconds)}
function syncDetailBid(){if(!$('detailOverlay')?.classList.contains('open'))return;const q=lots[detailIndex],isCurrent=Number(q?.no)===Number(lots[i]?.no);$('detailCurrentBid').textContent=money(isCurrent?price:Number(q?.price||0));$('detailMyBid').textContent=isCurrent&&myLatestBidAmount!=null?money(myLatestBidAmount):'—';$('detailBidTime').textContent=isCurrent?detailCountdown():'Торги по расписанию';$('detailBidAmount').textContent=money((isCurrent?price:Number(q?.price||0))+inc);$('detailBidSubmit').disabled=!isCurrent||closed||bidSubmitting;}
function openLotDetail(idx){detailIndex=idx;const q=lots[idx];if(!q)return;const photos=(q.photos||[]).filter(Boolean);$("detailHero").src=photos[0]||'';$("detailHero").style.display=photos.length?'block':'none';$("detailThumbs").innerHTML=photos.map((u,k)=>`<img src="${whiteEscape(u)}" class="${k===0?'active':''}" data-dphoto="${whiteEscape(u)}">`).join('');$("detailThumbs").querySelectorAll('img').forEach(im=>im.onclick=()=>{$("detailHero").src=im.dataset.dphoto;$("detailThumbs").querySelectorAll('img').forEach(z=>z.classList.remove('active'));im.classList.add('active')});$("detailTitle").textContent=q.title;$("detailChips").replaceChildren();$("detailSpecs").innerHTML=completeVehicleDetails(q).map(d=>`<div class="detailrow"><span>${whiteEscape(vehicleLabels[d[0]]||d[0])}</span><b>${whiteEscape(d[1]||'—')}</b></div>`).join('');syncDetailBid();$("catalogOverlay").classList.remove('open');$("queueOverlay").classList.remove('open');$("detailOverlay").classList.add('open');syncDetailBid();}

function render(doSubscribe=true){
 const x=lots[i];
 const qp=liveTodayQueue.indexOf(Number(x.no));
 $("count").textContent=qp>=0?`Позиция ${qp+1} из ${liveTodayQueue.length||0}`:`Позиция — из ${liveTodayQueue.length||0}`;
 $("lot").textContent=auctionDateLabel(); $("title").textContent=x.title;
 $("chips").replaceChildren();
 $("lotsBtn").textContent=`Лоты (${liveTodayQueue.length}) ›`;
 $("gallery").innerHTML=x.photos.map((u,k)=>`<img src="${whiteEscape(u)}" data-photo-index="${k}" alt="Фото ${k+1}">`).join("");
 if(whitePhotoLot!==x.no){currentPhotoIndex=0;whitePhotoLot=x.no;}
 setLivePhoto(currentPhotoIndex);attachHeroSwipe();
 renderWatchlist();renderCatalog();
 const labels={...vehicleLabels,Steering:'Руль',Warranty:'Гарантия',Power:'Мощность',Key:'Ключи'};
 $("details").innerHTML=completeVehicleDetails(x).map(d=>`<div class="detailrow"><span>${whiteEscape(labels[d[0]]||d[0])}</span><b>${whiteEscape(d[1]||'—')}</b></div>`).join("");
 if(doSubscribe)subscribeLot();syncRecentBidders();update();
}

function userIsLeader(){return !!(tgUser?.id && latestLeaderUserId && String(tgUser.id)===String(latestLeaderUserId));}
function updateBidVisualState(){
 const banner=$("bidStateBanner"),btn=$("bid"),ring=document.querySelector(".bidcircle"),status=$("circleStatus"),statusIcon=$("circleStatusIcon"),statusText=$("circleStatusText");if(!banner||!btn||!ring)return;
 const bonus=whiteIsBonus(),accepted=Date.now()<bidAcceptedUntil;let color='#ef3340',text='Сделайте первую ставку',mode='neutral';
 banner.className='bidStateBanner';btn.classList.remove('leader','outbid');ring.classList.remove('stateWin','stateOutbid','stateAccepted','stateNeutral');
 if(closed){color='#91a0b2';text=stateRow?.status==='waiting'?'Торги завершены':'Лот закрыт';mode='neutral';}
 else if(accepted){color='#0b9f54';text='Ставка принята!';mode='accepted';banner.classList.add('win');btn.classList.add('leader');}
 else if(userIsLeader()){color='#0b9f54';text='Вы лидируете!';mode='win';banner.classList.add('win');btn.classList.add('leader');}
 else if(userHasBidThisLot){color='#ef3340';text='Ставка перебита!';mode='outbid';banner.classList.add('outbid');btn.classList.add('outbid');}
 else {color='#ef3340';text=latestLeaderUserId?'Лидирует другой участник':'Сделайте первую ставку';mode='neutral';banner.classList.add('outbid');btn.classList.add('outbid');}
 ring.classList.add(mode==='win'?'stateWin':mode==='outbid'?'stateOutbid':mode==='accepted'?'stateAccepted':'stateNeutral');
 ring.style.setProperty('--ring',color);ring.style.setProperty('--track',(mode==='win'||mode==='accepted')?'#c6edd8':'#f8d3d8');
 if(status){status.hidden=!(mode==='win'||mode==='outbid'||mode==='accepted');if(!status.hidden){statusIcon.textContent=mode==='outbid'?'!':mode==='accepted'?'●':'✓';statusText.textContent=mode==='outbid'?'СТАВКА ПЕРЕБИТА!':mode==='accepted'?'СТАВКА ПРИНЯТА!':'ВЫ ЛИДИРУЕТЕ!';}}
 const ct=$("circleTime"),cl=$("circleLabel");if(ct)ct.style.display=status&&!status.hidden?'none':'';if(cl)cl.style.display=status&&!status.hidden?'none':'';
 banner.style.display='none';$("phaseTitle").hidden=!bonus;
 const my=$("myBidAmount");if(my)my.textContent=myLatestBidAmount==null?'—':money(myLatestBidAmount);
 if(!closed){const target=money(price+inc);btn.innerHTML=whiteGavel+(userIsLeader()?' ПОВЫСИТЬ ДО ':' СДЕЛАТЬ СТАВКУ ')+target;}
}
function closeModernScreens(){document.querySelectorAll(".modernScreen").forEach(x=>x.classList.remove("open"));document.querySelectorAll("#modernBottomNav button").forEach(x=>x.classList.remove("active"));}
function setModernActive(key){document.querySelectorAll("#modernBottomNav button").forEach(x=>x.classList.toggle("active",x.dataset.modern===key));}
function applyReferenceLayout(){
 const main=document.querySelector('.main'),details=$("details"),bid=document.querySelector('.bidcol');
 const lower=document.createElement('div');lower.className='auctionLower';
 details.parentNode.insertBefore(lower,details);const specs=document.createElement('div');specs.className='specColumn';lower.append(specs,bid);specs.append(details); const participants=document.querySelector('.participants'); if(participants) participants.remove();
 // Keep the existing controls in the app footer above the bottom navigation.
 const controls=$("tradeControls");
 if(controls) document.querySelector('.app').append(controls);
 const history=$("whiteHistory");
 if(history) bid.querySelector('.bidbox').append(history);
}
let liveAudienceBaseline=null;
async function loadRegisteredUsersCount(){
 let n=null;
 try{const r=await fetch('/api/public-stats',{cache:'no-store'});if(r.ok){const d=await r.json();n=Number(d.registeredUsers)}}catch(e){}
 if(!Number.isFinite(n)){try{const q=await supabase.from('auction_users').select('*',{count:'exact',head:true});if(!q.error)n=Number(q.count)}catch(e){}}
 if(Number.isFinite(n)){
   if(liveAudienceBaseline===null) liveAudienceBaseline=n;
   const added=Math.max(0,n-liveAudienceBaseline);
   const text=n+' '+(n===1?'клиент':(n>=2&&n<=4?'клиента':'клиентов'));
   const a=document.getElementById('registeredUsersCount'),b=document.getElementById('liveAudience');
   if(a)a.textContent=text;
   if(b)b.textContent='👥 '+text+(added>0?'  +'+added:'');
 }
}
applyReferenceLayout();
loadRegisteredUsersCount();
setInterval(loadRegisteredUsersCount,15000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)loadRegisteredUsersCount()});
function renderModernMarkets(){
 const markets=[
  {id:'uae',name:'Дубай (ОАЭ)',key:'Dubai',x:55,y:67,live:true},
  {id:'usa',name:'США (USA)',key:'USA',x:22,y:48},{id:'canada',name:'Канада (Canada)',key:'Canada',x:17,y:31},
  {id:'europe',name:'Европа (Europe)',key:'Europe',x:49,y:28},{id:'china',name:'Китай (China)',key:'China',x:74,y:38},
  {id:'japan',name:'Япония (Japan)',key:'Japan',x:88,y:48},{id:'georgia',name:'Грузия (Georgia)',key:'Georgia',x:66,y:53},
  {id:'korea',name:'Корея (Korea)',key:'Korea',x:83,y:67}
 ];
 let selectedMarket='uae';
 function renderMarketMap(){
   const box=$("modernMarkets");
   box.querySelectorAll('.mapPin').forEach(n=>n.remove());
   markets.forEach(m=>{const b=document.createElement('button');b.className='mapPin '+(m.id===selectedMarket?'active ':'')+(m.live?'livePin':'');b.style.left=m.x+'%';b.style.top=m.y+'%';b.innerHTML=`<i></i><span>${m.name.replace(/ \(.+?\)/,'')}<small>${m.live?'LIVE':'Coming Soon'}</small></span>`;b.onclick=()=>{selectedMarket=m.id;renderMarketMap();renderMarketSelected()};box.appendChild(b)});
 }
 function renderMarketSelected(){const m=markets.find(x=>x.id===selectedMarket);$("marketSelected").innerHTML=`<div class="marketSelectedCard ${m.live?'live':''}"><div class="marketMain"><img src="assets/markets/${m.id}.webp" alt="${m.name}"><div class="marketCopy"><b>${m.name}</b><p>${m.live?'Единственный доступный рынок сейчас':'Рынок готовится к запуску'}</p><em>${m.live?'● LIVE':'Coming Soon'}</em></div><span class="go">${m.live?'›':''}</span></div>${m.live?`<div class="marketBenefits"><div><strong>⚒</strong><b>Реальные лоты</b><small>Со всего мира</small></div><div><strong>♢</strong><b>Проверенные продавцы</b><small>Безопасные сделки</small></div><div><strong>▣</strong><b>Международная доставка</b><small>В любую страну</small></div></div>`:''}</div>`;const c=$("marketSelected").firstElementChild;if(m.live)c.onclick=()=>{selectedCountry=m.key;closeModernScreens();setModernActive('home')};}
 renderMarketMap();renderMarketSelected();
}
async function renderModernMyBids(){
 whiteRenderBidRows();
}
const PROFILE_LANGUAGES={ru:'Русский',en:'English',ar:'العربية'};
const PROFILE_FLAGS={AE:'🇦🇪',KZ:'🇰🇿',RU:'🇷🇺',US:'🇺🇸',GB:'🇬🇧',GE:'🇬🇪'};
function setProfileAvatar(el,d,name){if(!el)return;const url=d.avatar_url||tgUser?.photo_url||'';el.textContent=(name.trim().slice(0,2)||'MK').toUpperCase();el.style.backgroundImage=url?`url("${String(url).replace(/["\\]/g,"\\$&")}")`:'';el.classList.toggle('hasPhoto',!!url)}
function profileLanguageKey(){return 'galaxyLanguage:'+(tgUser?.id||'guest')}
function selectedProfileLanguage(){try{const code=localStorage.getItem(profileLanguageKey());return Object.hasOwn(PROFILE_LANGUAGES,code)?code:'ru'}catch{return 'ru'}}
function syncProfileLanguage(){const code=selectedProfileLanguage();$('modernProfileLanguage').textContent=PROFILE_LANGUAGES[code];document.querySelectorAll('[data-profile-language]').forEach(b=>b.classList.toggle('active',b.dataset.profileLanguage===code))}
function syncModernProfile(){
 if(!window.accountData)return;const d=window.accountData;const name=[d.first_name,d.last_name].filter(Boolean).join(' ')||d.username||'Telegram user';
 $("modernProfileName").textContent=name;$("modernProfileUser").textContent=d.username?'@'+d.username:String(d.telegram_id||'');$("modernProfileAvatar").textContent=(name.slice(0,2)||'MK').toUpperCase();$("modernProfileDeposit").textContent=money(Number(d.deposit_amount||0));$("modernProfileLimit").textContent=money(Number(d.bid_limit||0));$("openAdminFromProfile").style.display=d.is_admin?'block':'none';
 setProfileAvatar($("modernProfileAvatar"),d,name);
 const active=String(d.account_status||'').toLowerCase()==='active';$("modernProfileStatus").textContent=active?'● Активный аккаунт':'● '+String(d.account_status||'ОЖИДАЕТ АКТИВАЦИИ').toUpperCase();$("modernProfileStatus").classList.toggle('inactive',!active);
 const phone=String(d.phone||'').trim(),flag=PROFILE_FLAGS[String(d.phone_country||'').toUpperCase()]||'';$("modernProfilePhone").textContent=phone?`${flag?flag+' ':''}${phone}`:'📞 Телефон не указан';$("modernProfileEmail").textContent=d.email?'✉️ '+d.email:'✉️ Email не указан';
 syncProfileLanguage();
 syncPersonalInformationCard();
}
function update(){
 const waiting=stateRow?.status==='waiting';const bonus=whiteIsBonus();
 $("selectedInc").textContent="+"+money(inc);$("price").textContent=money(price);$("leaderPrice").textContent=money(price);$("bidder").textContent="Bidder #"+bidder;
 $("timer").textContent=closed?'SOLD':whiteTime(seconds);
 $("circleTime").textContent=waiting?whiteTime(seconds):(closed?'SOLD':whiteTime(seconds));
 $("circleLabel").textContent=waiting?'до следующего аукциона':(bonus?'Бонусный тайм':'до окончания');
 const ring=document.querySelector('.bidcircle');
 const phaseDuration=bonus?BONUS_SECONDS:LOT_SECONDS;
 const remaining=Math.max(0,phaseDuration-elapsedSeconds());
 // Continuous fractional progress: the ring drains clockwise smoothly instead of jumping once per second.
 ring.style.setProperty('--progress',waiting?'0%':Math.max(0,Math.min(100,remaining/phaseDuration*100)).toFixed(3)+'%');
 $("soundStatus").textContent=waiting?'Перерыв между аукционами':(bonus?'BONUS TIME':(soundOn?'LIVE AUCTION · Звук включён':'LIVE AUCTION'));
 $("bid").textContent=closed?'ЛОТ ЗАКРЫТ':(bidSubmitting?'Проверка…':'СДЕЛАТЬ СТАВКУ');
 $("bid").disabled=closed||bidSubmitting;syncDetailBid();
 const live=document.querySelector('header .live');live.textContent=waiting?'':'● LIVE';live.classList.toggle('paused',waiting);
 updateBidVisualState();
}
function restartPhaseAudio(){
 if(!soundOn||closed)return;
 const a=$("auctionAudio"); a.pause(); a.currentTime=0; a.play().catch(()=>{});
}
(function setupSevenSecondAudioLoop(){
 const a=$("auctionAudio"); if(!a)return;
 a.addEventListener("timeupdate",()=>{if(soundOn&&!closed&&a.currentTime>=10){a.currentTime=0;a.play().catch(()=>{})}});
 a.addEventListener("ended",()=>{if(soundOn&&!closed){a.currentTime=0;a.play().catch(()=>{})}});
})();
async function updateFromClock(){
 if(!stateRow)return;
 const started=new Date(stateRow.phase_started_at||stateRow.updated_at||Date.now()).getTime();
 const age=Math.max(0,(serverNowMs()-started)/1000);
 const currentPhase=String(stateRow.phase||"red").toLowerCase();

 // After lot 15 keep the existing 10-minute break before the next auction cycle.
 if(stateRow.status==="waiting"){
   closed=true;
   const remain=galaxyStartAt?Math.max(0,Math.floor((new Date(galaxyStartAt).getTime()-serverNowMs())/1000)):Math.max(0,WAIT_SECONDS-Math.floor(age));
   seconds=remain; update();
   const txt=galaxyFormatCountdown(remain*1000),label=auctionDateLabel(),n=liveTodayQueue.length;
   $("circleTime").textContent=txt;$("circleLabel").textContent='до начала аукциона';
   $("soundStatus").textContent=`${label} · ${lotCountLabel(n)} · через ${txt}`;
   $("bid").disabled=true; $("bid").style.opacity=".45";
   if(soundOn){const a=$("auctionAudio");a.pause();a.currentTime=0}
   return;
 }

 // SOLD is deliberately visible briefly, then the next lot starts.
 if(currentPhase==="sold"){
   closed=true; seconds=0; phase="sold"; update();
   $("timer").textContent="SOLD"; $("circleTime").textContent="SOLD"; $("circleLabel").textContent="лот продан";
   $("soundStatus").textContent="SOLD"; $("bid").disabled=true; $("bid").style.opacity=".45";
   if(age>=SOLD_SECONDS){ return; }
   return;
 }

 // First stage: 10 seconds normal auction time.
 if(currentPhase!=="bonus" && currentPhase!=="green"){
   if(age>=LOT_SECONDS){ return; }
   closed=false; phase="red"; seconds=Math.max(1,LOT_SECONDS-Math.floor(age));
   $("bid").disabled=bidSubmitting; $("bid").style.opacity=bidSubmitting?".72":"1"; update();
   return;
 }

 // Second stage: 10 seconds BONUS TIME. A bid during bonus restarts these 10 seconds.
 if(age>=BONUS_SECONDS){ return; }
 closed=false; phase="bonus"; seconds=Math.max(1,BONUS_SECONDS-Math.floor(age));
 $("bid").disabled=bidSubmitting; $("bid").style.opacity=bidSubmitting?".72":"1"; update();
}
function start(){clearInterval(timerId);timerId=setInterval(updateFromClock,16)}
function sellerApprovalVoice(){
 if(!soundOn || !("speechSynthesis" in window)) return;
 speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance("Sold, pending seller approval.");
 u.lang="en-US";u.rate=.92;u.pitch=.72;u.volume=1; const voices=speechSynthesis.getVoices();
 const male=voices.find(v=>/Daniel|Alex|Fred|Aaron|Tom|Google US English/i.test(v.name)&&/^en/i.test(v.lang))||voices.find(v=>/^en/i.test(v.lang));
 if(male)u.voice=male;speechSynthesis.speak(u);
}
document.querySelectorAll("[data-inc]").forEach(b=>b.onclick=()=>{inc=+b.dataset.inc;update()});
$("bid").onclick=submitBid;
function toggleAuctionSound(){ctx();soundOn=!soundOn;let a=$("auctionAudio");whiteSyncSound();$("soundStatus").textContent=soundOn?"LIVE AUCTION · Звук включён":"LIVE AUCTION · Звук выключен";if(soundOn){restartPhaseAudio()}else{a.pause();a.currentTime=0;const bs=$("bidAudio");if(bs){bs.pause();bs.currentTime=0}}}

const incs=[100,1000,10000];
$("minus").onclick=()=>{let k=Math.max(0,incs.indexOf(inc)-1);inc=incs[k];update()};
$("plus").onclick=()=>{let k=Math.min(incs.length-1,incs.indexOf(inc)+1);inc=incs[k];update()};
$("lotsBtn").onclick=()=>{renderCatalog();$("catalogOverlay").classList.add("open")};
$("closeQueue").onclick=()=>$("queueOverlay").classList.remove("open");
$("queueOverlay").onclick=e=>{if(e.target===$("queueOverlay"))$("queueOverlay").classList.remove("open")};
$("closeCatalog").onclick=()=>$("catalogOverlay").classList.remove("open");
$("catalogOverlay").onclick=e=>{if(e.target===$("catalogOverlay"))$("catalogOverlay").classList.remove("open")};
$("detailClose").onclick=$("detailBack").onclick=()=>$("detailOverlay").classList.remove("open");
$("detailOverlay").onclick=e=>{if(e.target===$("detailOverlay"))$("detailOverlay").classList.remove("open")};
$("detailBidMinus").onclick=()=>{let k=Math.max(0,incs.indexOf(inc)-1);inc=incs[k];update();syncDetailBid()};
$("detailBidPlus").onclick=()=>{let k=Math.min(incs.length-1,incs.indexOf(inc)+1);inc=incs[k];update();syncDetailBid()};
$("detailBidSubmit").onclick=submitBid;

$("mkBtn").onclick=()=>{$("queueOverlay").classList.remove("open");$("marketRadial").classList.toggle("open")};
document.querySelectorAll("[data-market]").forEach(b=>b.onclick=()=>{selectedCountry=b.dataset.market;document.querySelectorAll("[data-market]").forEach(x=>x.classList.toggle("selected",x===b));$("marketRadial").classList.remove("open")});
$("waitBtn").onclick=()=>{$("marketRadial").classList.remove("open");renderWatchlist();$("queueOverlay").classList.add("open")};
let currentAccountProfile=null;
let adminClients=[];
let adminAccess={admin:false,owner:false};
function syncPersonalInformationCard(){
  const data=window.accountData;if(!data)return;
  const name=data.full_name||[data.first_name,data.last_name].filter(Boolean).join(' ')||data.username||'Telegram user';
  $("modernProfileName").textContent=name;
  setProfileAvatar($("modernProfileAvatar"),data,name);
  const phone=window.GalaxyAccountInformation.formatPhone(data.phone,data.phone_country);
  const flag=PROFILE_FLAGS[String(data.phone_country||'').toUpperCase()]||'';
  $("modernProfilePhone").textContent=phone?(flag?flag+' ':'')+phone:'📞 Телефон не указан';
  $("modernProfileEmail").textContent=data.email?'✉️ '+data.email:'✉️ Email не указан';
}
const personalInformation=window.GalaxyAccountInformation.createAccountInformation({
  document,
  getAccountData:()=>window.accountData||{},
  setAccountData:data=>{window.accountData=data;currentAccountProfile=data;},
  getTelegramUser:()=>tgUser,
  getInitData:()=>tg?.initData||"",
  fetch:(url,options)=>fetch(url,options),
  ready:()=>registrationReady,
  beforeLoad:()=>loadAccountProfile({skipPersonalInformation:true}),
  onSync:syncPersonalInformationCard,
  onOpen:()=>{closeModernScreens();setModernActive("profile");$("accountOverlay").classList.remove("open");},
  onClose:()=>{setModernActive("profile");$("profileScreen").classList.add("open");}
});

async function refreshAdminAccess(){
  if(!tgUser?.id){adminAccess={admin:false,owner:false};return adminAccess;}
  try{const r=await fetch("/api/admin-access",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({initData:tg?.initData||""})});const d=await r.json();adminAccess=r.ok?d:{admin:false,owner:false};}
  catch(e){adminAccess={admin:false,owner:false};}
  const show=!!adminAccess.admin; const p=$("openAdminFromProfile"),q=$("adminQuick"),a=$("adminAccountBtn"); if(p)p.style.display=show?"block":"none";if(q)q.style.display=show?"inline-flex":"none";if(a)a.style.display=show?"block":"none";return adminAccess;
}
async function loadAccountProfile(options={}){
  const hint=$("accountHint");
  if(!tgUser?.id){
    $("accountName").textContent="Откройте через Telegram";
    $("accountUsername").textContent="Mini App";
    $("accountTelegramId").textContent="—";
    $("accountDeposit").textContent="$0";
    $("accountLimit").textContent="$0";
    $("accountStatus").textContent="НЕ АВТОРИЗОВАН";
    hint.textContent="Профиль загружается автоматически только внутри Telegram Mini App.";
    return;
  }
  hint.textContent="Загрузка профиля…";
  try{
    await registrationReady;
    const {data,error}=await db.from("auction_users").select("telegram_id,username,first_name,last_name,deposit_amount,deposit_method,bid_limit,account_status,deposit_updated_at,is_admin").eq("telegram_id",String(tgUser.id)).single();
    if(error) throw error;
    currentAccountProfile=data;
    window.accountData={...window.accountData,...data};syncModernProfile();refreshRegisteredCount();await refreshAdminAccess();
    const name=[data.first_name,data.last_name].filter(Boolean).join(" ") || data.username || "Telegram user";
    $("accountName").textContent=name;
    $("accountUsername").textContent=data.username?"@"+data.username:"Без username";
    $("accountTelegramId").textContent=data.telegram_id||"—";
    $("accountDeposit").textContent=money(Number(data.deposit_amount||0));
    $("accountLimit").textContent=money(Number(data.bid_limit||0));
    $("accountMethod").textContent=(data.deposit_method||"—").toUpperCase();
    $("accountUpdated").textContent=data.deposit_updated_at?new Date(data.deposit_updated_at).toLocaleString():"—";
    const active=String(data.account_status||"").toLowerCase()==="active";
    $("accountStatus").textContent=active?"ACTIVE":"ОЖИДАЕТ АКТИВАЦИИ";
    $("accountStatus").classList.toggle("active",active);
    $("accountAvatar").textContent=(name.trim().slice(0,2)||"MK").toUpperCase();
    hint.textContent=active?"Участие в аукционе активировано.":"После получения наличного депозита администратор активирует ваш лимит ставок.";
    if(!options.skipPersonalInformation)await personalInformation.load({silent:true});
  }catch(err){
    console.error("Account profile load failed",err);
    hint.textContent="Не удалось загрузить профиль. Нажмите «Обновить данные».";
  }
}
function openAccount(){
  $("marketRadial").classList.remove("open");
  $("queueOverlay").classList.remove("open");
  return personalInformation.open();
}
$("settingsBtn").onclick=openAccount;
renderModernMarkets();
document.querySelectorAll("[data-close-modern]").forEach(b=>b.onclick=()=>{closeModernScreens();setModernActive("home");$("homeScreen").classList.add("open")});
document.querySelectorAll("#modernBottomNav [data-modern]").forEach(b=>b.onclick=()=>{const k=b.dataset.modern;closeModernScreens();setModernActive(k);if(k==="home")$("homeScreen").classList.add("open");else if(k==="markets")$("marketsScreen").classList.add("open");else if(k==="bids"){renderModernMyBids();$("myBidsScreen").classList.add("open")}else if(k==="profile"){syncModernProfile();loadAccountProfile();$("profileScreen").classList.add("open")}});
document.querySelectorAll("[data-home-auction]").forEach(b=>b.onclick=()=>{closeModernScreens();setModernActive("markets");$("marketsScreen").classList.add("open");});
$("openAccountFromProfile").onclick=()=>{closeModernScreens();openAccount()};
$("openAdminFromProfile").onclick=()=>{closeModernScreens();openAdminPanel()};
$("accountClose").onclick=()=>$("accountOverlay").classList.remove("open");
$("accountOverlay").onclick=e=>{if(e.target===$("accountOverlay"))$("accountOverlay").classList.remove("open")};
$("accountRefresh").onclick=loadAccountProfile;


// Top-card controls use the existing account flow; language is a device preference.
function openProfileAccount(){closeModernScreens();openAccount()}
function openProfileLanguage(){syncProfileLanguage();$('profileLanguageOverlay').classList.add('open');$('profileLanguageOverlay').setAttribute('aria-hidden','false')}
function closeProfileLanguage(){$('profileLanguageOverlay').classList.remove('open');$('profileLanguageOverlay').setAttribute('aria-hidden','true')}
$('profileEdit').onclick=openProfileAccount;$('profilePhoneRow').onclick=openProfileAccount;$('profileEmailRow').onclick=openProfileAccount;
$('profileLanguageRow').onclick=openProfileLanguage;$('profileLanguageClose').onclick=closeProfileLanguage;$('profileLanguageOverlay').onclick=e=>{if(e.target===$('profileLanguageOverlay'))closeProfileLanguage()};
document.querySelectorAll('[data-profile-language]').forEach(b=>b.onclick=()=>{const code=b.dataset.profileLanguage;if(!Object.hasOwn(PROFILE_LANGUAGES,code))return;try{localStorage.setItem(profileLanguageKey(),code)}catch{}syncProfileLanguage();closeProfileLanguage()});
syncProfileLanguage();

async function adminApi(path,payload={}){
  if(!tg?.initData) throw new Error("Откройте приложение через Telegram");
  const r=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({initData:tg.initData,...payload})});
  const j=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(j.error||"Admin API error");
  return j;
}
function adminMoney(v){return "$"+Number(v||0).toLocaleString("en-US",{maximumFractionDigits:0});}
function adminStatusLabel(v){v=String(v||"pending").toLowerCase();return v==="active"?"ACTIVE":v==="blocked"?"BLOCKED":"PENDING";}
function renderAdminClients(){
  const root=$("adminClientList"),q=($("adminSearch").value||"").trim().toLowerCase();
  const rows=adminClients.filter(u=>!q||String(u.username||"").toLowerCase().includes(q)||String(u.telegram_id||"").includes(q)||String(u.first_name||"").toLowerCase().includes(q));
  const active=adminClients.filter(u=>u.account_status==="active").length,pending=adminClients.filter(u=>u.account_status!=="active"&&u.account_status!=="blocked").length,blocked=adminClients.filter(u=>u.account_status==="blocked").length;
  $("adminSummary").textContent=`Всего ${adminClients.length} • Active ${active} • Pending ${pending} • Blocked ${blocked}`;
  root.innerHTML=rows.map((u,idx)=>{const name=[u.first_name,u.last_name].filter(Boolean).join(" ")||u.username||"Telegram user";const original=adminClients.indexOf(u);return `<button class="adminClient" data-client="${original}"><div class="adminClientAvatar">${(name.slice(0,2)||"MK").toUpperCase()}</div><div class="adminClientInfo"><b>${u.username?"@"+u.username:name}</b><small>${u.telegram_id}</small><div><span>${adminMoney(u.deposit_amount)} deposit</span><span>${adminMoney(u.bid_limit)} limit</span></div></div><span class="adminPill ${String(u.account_status||"pending").toLowerCase()}">${adminStatusLabel(u.account_status)}</span><span class="adminChevron">›</span></button>`}).join("")||'<div class="emptyWatch">Клиенты не найдены.</div>';
  root.querySelectorAll("[data-client]").forEach(b=>{b.onclick=()=>openAdminClientProfile(adminClients[Number(b.dataset.client)]);});
}
async function loadAdminClients(){
  $("adminSummary").textContent="Загрузка клиентов…";$("adminClientList").innerHTML="";
  try{const out=await adminApi("/api/admin-users");adminClients=out.users||[];renderAdminClients();}
  catch(e){$("adminSummary").textContent="Ошибка: "+e.message;}
}
let adminProfileClient=null;
function renderAdminClientProfileTab(tab){
  const root=$("adminClientProfileContent"); if(!root)return;
  document.querySelectorAll('[data-client-profile-tab]').forEach(b=>b.classList.toggle('active',b.dataset.clientProfileTab===tab));
  if(tab==='history'){root.innerHTML=`<div class="adminClientHistoryRow"><b>Регистрация клиента</b><span>Telegram ID ${whiteEscape(String(adminProfileClient?.telegram_id||'—'))}</span></div><div class="adminClientHistoryRow"><b>Текущий статус: ${whiteEscape(adminStatusLabel(adminProfileClient?.account_status))}</b><span>Депозит ${adminMoney(adminProfileClient?.deposit_amount)} • лимит ${adminMoney(adminProfileClient?.bid_limit)}</span></div>`;return;}
  if(tab==='docs'){root.innerHTML='<div class="adminClientEmpty">Документов у клиента пока нет.</div>';return;}
  root.innerHTML='<div class="adminClientEmpty">Автомобили клиента появятся здесь после подтверждённой покупки.</div>';
}
function openAdminClientProfile(u){
  if(!u)return; adminProfileClient=u;
  const name=[u.first_name,u.last_name].filter(Boolean).join(' ')||u.username||'Telegram user';
  $("adminClientProfileName").textContent=name; $("adminClientProfileUsername").textContent=u.username?'@'+u.username:'Без username'; $("adminClientProfileId").textContent=u.telegram_id||'—'; $("adminClientProfileAvatar").textContent=(name.slice(0,2)||'MK').toUpperCase();
  const st=String(u.account_status||'pending').toLowerCase(), badge=$("adminClientProfileStatus"); badge.textContent=adminStatusLabel(st); badge.className='adminClientProfileStatus '+st;
  $("adminClientProfileDeposit").textContent=adminMoney(u.deposit_amount); $("adminClientProfileLimit").textContent=adminMoney(u.bid_limit);
  $("adminClientCarsCount").textContent='0'; $("adminClientDocsCount").textContent='0'; $("adminClientShippingCount").textContent='0'; $("adminClientCarsTabCount").textContent='(0)'; $("adminClientDocsTabCount").textContent='(0)';
  renderAdminClientProfileTab('cars'); $("adminClientProfileOverlay").classList.add('open');
}
async function openAdminPanel(){
  await refreshAdminAccess(); if(!adminAccess.admin){alert("Нет доступа к админ-панели");return;}
  $("accountOverlay").classList.remove("open");$("adminOverlay").classList.add("open");setAdminView("clients");loadAdminClients();
}
function openAdminEditor(u){
  const name=[u.first_name,u.last_name].filter(Boolean).join(" ")||u.username||"Telegram user";
  $("adminEditName").textContent=name;$("adminEditUser").textContent=u.username?"@"+u.username:u.telegram_id;$("adminEditAvatar").textContent=(name.slice(0,2)||"MK").toUpperCase();
  $("adminEditTelegramId").value=u.telegram_id;$("adminEditDeposit").value=Number(u.deposit_amount||0);$("adminEditLimit").value=Number(u.bid_limit||0);$("adminEditMethod").value=u.deposit_method||"cash";$("adminEditStatus").value=String(u.account_status||"pending").toLowerCase();$("adminEditNote").value="";$("adminEditStatusBadge").textContent=adminStatusLabel(u.account_status);$("adminSaveMsg").textContent="";
  const rb=$("adminRoleBox"),rt=$("adminRoleToggle"); if(rb)rb.style.display=adminAccess.owner?"block":"none"; if(rt){rt.dataset.isAdmin=u.is_admin?"1":"0";rt.textContent=u.is_admin?"УБРАТЬ ПРАВА АДМИНА":"НАЗНАЧИТЬ АДМИНОМ";}
  $("adminEditOverlay").classList.add("open");
}
async function saveAdminClient(){
  const btn=$("adminSave"),msg=$("adminSaveMsg");btn.disabled=true;btn.textContent="СОХРАНЕНИЕ…";msg.textContent="";
  try{const out=await adminApi("/api/admin-update",{targetTelegramId:$("adminEditTelegramId").value,depositAmount:Number($("adminEditDeposit").value||0),bidLimit:Number($("adminEditLimit").value||0),method:$("adminEditMethod").value,status:$("adminEditStatus").value,note:$("adminEditNote").value.trim()||null});msg.textContent="✅ Сохранено";msg.className="adminSaveMsg ok";await loadAdminClients();if(String(tgUser?.id)===String($("adminEditTelegramId").value))loadAccountProfile();setTimeout(()=>$("adminEditOverlay").classList.remove("open"),650);}
  catch(e){msg.textContent="Ошибка: "+e.message;msg.className="adminSaveMsg error";}
  finally{btn.disabled=false;btn.textContent="СОХРАНИТЬ";}
}
async function toggleAdminRole(){const btn=$("adminRoleToggle"),msg=$("adminSaveMsg"),target=$("adminEditTelegramId").value,newValue=btn.dataset.isAdmin!=="1";btn.disabled=true;try{const out=await adminApi("/api/admin-role",{targetTelegramId:target,isAdmin:newValue});btn.dataset.isAdmin=out.isAdmin?"1":"0";btn.textContent=out.isAdmin?"УБРАТЬ ПРАВА АДМИНА":"НАЗНАЧИТЬ АДМИНОМ";msg.textContent=out.isAdmin?"✅ Пользователь назначен администратором":"✅ Права администратора сняты";msg.className="adminSaveMsg ok";await loadAdminClients();}catch(e){msg.textContent="Ошибка: "+e.message;msg.className="adminSaveMsg error"}finally{btn.disabled=false}}
if($("adminRoleToggle"))$("adminRoleToggle").onclick=toggleAdminRole;
let adminLots=[];
let adminLotFiles=[];
function setAdminView(view){
  const clients=view==="clients";
  $("adminClientsView").style.display=clients?"block":"none";
  $("adminLotsView").style.display=clients?"none":"block";
  $("adminTabClients").classList.toggle("active",clients);
  $("adminTabLots").classList.toggle("active",!clients);
  $("adminPanelTitle").textContent=clients?"АДМИН • КЛИЕНТЫ":"АДМИН • ЛОТЫ";
  if(!clients){ if($("adminLotFilter")) $("adminLotFilter").value="all"; $("adminLotsView")?.querySelectorAll(".adminStatusFilter [data-status]").forEach((b,i)=>b.classList.toggle("active",i===0)); loadAdminLots(); }
}
function renderAdminLots(){
  const root=$("adminLotList"), q=String($("adminLotSearch")?.value||"").trim().toLowerCase(), filter=$("adminLotFilter")?.value||"all";
  const group=l=>{const st=String(l.status||"draft").toLowerCase();if(st==='pending')return 'pending';if(st==='sold')return 'sold';if(st==='upcoming'||st==='live')return 'auction';return 'inventory';};
  const shown=adminLots.filter(l=>{const text=[l.make,l.model,l.year,l.vin].join(" ").toLowerCase();return (filter==='all'||group(l)===filter)&&(!q||text.includes(q))});
  const count=g=>adminLots.filter(x=>group(x)===g).length;
  $("adminLotsSummary").textContent=`Все ${adminLots.length} • Предстоящие ${count('auction')} • Ожидают подтверждения ${count('pending')} • Проданные ${count('sold')}`;
  const labels={inventory:'В НАЛИЧИИ',auction:'ПРЕДСТОЯЩИЙ',pending:'ОЖИДАЕТ',sold:'ПРОДАНО'};
  root.innerHTML=shown.map(l=>{const idx=adminLots.indexOf(l),pic=l.primary_image||l.images?.[0]?.image_url||"",g=group(l),winner=g==='pending'||g==='sold'?(l.winner_username||l.winner_user_id||'—'):'';return `<div class="adminLotCard" data-admin-lot="${idx}" role="button" tabindex="0">${pic?`<img class="adminLotPic" src="${pic}" alt="${whiteEscape([l.make,l.model,l.year].filter(Boolean).join(' '))}">`:''}<div class="adminLotInfo"><b>${whiteEscape(l.make||"")} ${whiteEscape(l.model||"")} ${l.year||""}</b><small>${l.mileage==null?'—':Number(l.mileage).toLocaleString()+' km'} • Starting ${adminMoney(l.starting_bid)}</small><small>${l.vin?"VIN "+whiteEscape(l.vin):"Без VIN"}</small>${winner?`<span class="adminLotDay">🏆 Победитель: ${whiteEscape(winner)} • ${adminMoney(l.winning_bid||0)}</span>`:''}</div><span class="adminLotStatus ${g}">${labels[g]}</span><span class="adminChevron">›</span></div>`}).join("")||'<div class="emptyWatch">Автомобили не найдены.</div>';
  root.querySelectorAll('[data-admin-lot]').forEach(el=>{const open=()=>openAdminLotManage(adminLots[Number(el.dataset.adminLot)]);el.onclick=open;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}}});
}
let adminManagedLot=null;
function openAdminLotManage(l){
  adminManagedLot=l;const pic=l.primary_image||l.images?.[0]?.image_url||"";
  $("adminLotManagePic").src=pic;$("adminLotManagePic").style.display=pic?'block':'none';$("adminLotManageTitle").textContent=`${l.make||""} ${l.model||""} ${l.year||""}`;
  const stNow=String(l.status||"draft").toLowerCase(),rejected=stNow==='draft'&&/\[\[rejected:/.test(String(l.description||'')), stLabel=rejected?'ПРОДАЖА ОТКЛОНЕНА':stNow==='draft'?'В НАЛИЧИИ':stNow==='upcoming'?'ПРЕДСТОЯЩИЙ':stNow==='live'?'LIVE':stNow==='pending'?'ОЖИДАЕТ ПОДТВЕРЖДЕНИЯ':stNow==='sold'?'ПРОДАЖА ПОДТВЕРЖДЕНА':stNow.toUpperCase();
  $("adminLotManageMeta").innerHTML=`<span>${l.year||'—'} год</span><span>VIN: ${whiteEscape(l.vin||'—')}</span><span>Lot ID: ${whiteEscape(l.lot_number??l.id??'—')}</span>`;
  $("adminLotManageStatus").textContent=stLabel;$("adminLotManageStatus").className=`adminLotManageStatus ${l.status||"draft"}`;const pd=$("adminPendingDecision");if(pd){const isPending=stNow==="pending";pd.style.display=isPending?"block":"none";if(isPending){$("adminPendingWinner").textContent="🏆 Победитель: "+(l.winner_username||l.winner_user_id||"—");$("adminPendingAmount").textContent="Финальная ставка: "+adminMoney(l.winning_bid||0);}}
  $("manageMake").value=l.make||'';$("manageModel").value=l.model||'';$("manageYear").value=l.year||'';$("manageMileage").value=l.mileage??'';$("manageVin").value=l.vin||'';$("manageStarting").value=Number(l.starting_bid||0);$("manageDescription").value=l.description||'';
  const hasBids=Number(l.bid_count||0)>0, sold=stNow==='sold';$("adminLotDelete").disabled=hasBids||sold;$("adminLotDelete").title=hasBids||sold?'Лот со ставками/SOLD нельзя удалить':'';
  $("adminLotManageMsg").textContent="";
  if($("adminLotSchedule")){ $("adminLotSchedule").style.display=stNow==="draft"?"block":"none"; $("adminLotSchedule").textContent="＋ ДОБАВИТЬ НА ЛОТ"; }
  if($("adminLotStartLive")) $("adminLotStartLive").style.display="none";
  if($("adminLotArchive")) $("adminLotArchive").style.display="none";
  $("adminLotManageOverlay").classList.add("open");
}
async function saveManagedLot(){if(!adminManagedLot)return;const msg=$("adminLotManageMsg"),btn=$("adminLotSaveChanges");btn.disabled=true;msg.textContent='Сохраняю…';try{const out=await adminApi('/api/admin-update-lot',{lotId:adminManagedLot.id,make:$("manageMake").value.trim(),model:$("manageModel").value.trim(),year:$("manageYear").value?Number($("manageYear").value):null,mileage:$("manageMileage").value?Number($("manageMileage").value):null,vin:$("manageVin").value.trim()||null,startingBid:Number($("manageStarting").value||0),description:$("manageDescription").value.trim()||null});adminManagedLot={...adminManagedLot,...out.lot,description:$("manageDescription").value.trim()||null};msg.textContent='✅ Изменения сохранены';msg.className='adminSaveMsg ok';await loadAdminLots();const fresh=adminLots.find(x=>String(x.id)===String(adminManagedLot.id));if(fresh)openAdminLotManage(fresh)}catch(e){msg.textContent='Ошибка: '+e.message;msg.className='adminSaveMsg error'}finally{btn.disabled=false}}
async function adminPendingAction(decision){if(!adminManagedLot||String(adminManagedLot.status).toLowerCase()!=='pending')return;const msg=$("adminLotManageMsg");try{const out=await adminApi('/api/admin-pending-action',{lotId:adminManagedLot.id,decision});msg.textContent=decision==='approve'?'✅ Продажа подтверждена':'↩️ Автомобиль возвращён в «Все»';msg.className='adminSaveMsg ok';await loadAdminLots();if(decision==='approve')await refreshHomeSales();const fresh=adminLots.find(x=>String(x.id)===String(adminManagedLot.id));if(fresh)openAdminLotManage(fresh);}catch(e){msg.textContent='Ошибка: '+e.message;msg.className='adminSaveMsg error'}}
async function archiveManagedLot(){if(!adminManagedLot)return;if(!confirm(`Архивировать ${adminManagedLot.make||""} ${adminManagedLot.model||""}? История сохранится.`))return;await adminLotAction('archive')}
async function deleteManagedLot(){if(!adminManagedLot)return;if(!confirm(`Удалить ${adminManagedLot.make||""} ${adminManagedLot.model||""} навсегда?`))return;const msg=$("adminLotManageMsg");try{await adminApi('/api/admin-delete-lot',{lotId:adminManagedLot.id});msg.textContent='✅ Лот удалён';msg.className='adminSaveMsg ok';await loadAdminLots();setTimeout(()=>$("adminLotManageOverlay").classList.remove('open'),500)}catch(e){msg.textContent='Ошибка: '+e.message;msg.className='adminSaveMsg error'}}
async function adminLotAction(action){
  if(!adminManagedLot)return;const buttons=[$("adminLotStartLive"),$("adminLotSchedule"),$("adminLotArchive")];buttons.forEach(b=>b&&(b.disabled=true));const msg=$("adminLotManageMsg");msg.textContent='Обновляю статус…';msg.className='adminSaveMsg';
  try{const out=await adminApi('/api/admin-lot-action',{lotId:adminManagedLot.id,action});adminManagedLot={...adminManagedLot,...(out.lot||{})};msg.textContent=action==='live'?'✅ Лот запущен LIVE':action==='upcoming'?'✅ Автомобиль добавлен в предстоящие лоты':'✅ Лот архивирован';msg.className='adminSaveMsg ok';await loadAdminLots();if(action==='archive')setTimeout(()=>$("adminLotManageOverlay").classList.remove('open'),500);else openAdminLotManage(adminManagedLot)}catch(e){msg.textContent='Ошибка: '+e.message;msg.className='adminSaveMsg error'}finally{buttons.forEach(b=>b&&(b.disabled=false))}
}
async function loadAdminLots(){
  $("adminLotsSummary").textContent="Загрузка лотов…";$("adminLotList").innerHTML="";
  try{if(!localStorage.getItem("ga_inventory_reset_v85")){await adminApi("/api/admin-reset-inventory",{});localStorage.setItem("ga_inventory_reset_v85","1");}const out=await adminApi("/api/admin-lots");adminLots=out.lots||[];renderAdminLots();}
  catch(e){$("adminLotsSummary").textContent="Ошибка: "+e.message;}
}
function resetLotForm(){
  ["lotYear","lotMake","lotModel","lotMileage","lotVin","lotSpecs","lotEngine","lotFuel","lotTransmission","lotDrive","lotSeats","lotExterior","lotInterior","lotStartingBid","lotReserve","lotDescription"].forEach(id=>$(id).value="");
  $("lotSellerApproval").checked=false;$("lotImages").value="";adminLotFiles=[];renderLotPhotoPreview();$("adminLotMsg").textContent="";
}
function openAddLot(){resetLotForm();$("adminLotOverlay").classList.add("open")}
let adminVinVehicle=null;
function openVinImport(){adminVinVehicle=null;$("adminVinInput").value="";$("adminVinMsg").textContent="";$("adminVinPreview").style.display="none";$("adminVinOverlay").classList.add("open");setTimeout(()=>$("adminVinInput").focus(),120)}
function closeVinImport(){$("adminVinOverlay").classList.remove("open")}
function nextAdminLotNumber(){return Math.max(0,...adminLots.map(x=>Number(x.lot_number)||0))+1}
async function findVinVehicle(){const vin=$("adminVinInput").value.trim().toUpperCase(),btn=$("adminVinFind"),msg=$("adminVinMsg");btn.disabled=true;btn.textContent="ИЩУ…";msg.textContent="Поиск заводских данных VIN…";msg.className="adminSaveMsg";$("adminVinPreview").style.display="none";try{const out=await adminApi('/api/admin-vin-lookup',{vin});adminVinVehicle=out.vehicle;const v=out.vehicle;$("adminVinTitle").textContent=[v.year,v.make,v.model,v.trim].filter(Boolean).join(' ')||v.vin;$("adminVinSource").textContent=`Источник: ${v.source} • VIN ${v.vin}`;const rows=[['Кузов',v.body],['Двигатель',v.engine],['Топливо',v.fuel],['КПП',v.transmission],['Привод',v.drive],['Мест',v.seats],['Производитель',v.manufacturer],['Завод',v.plant]];$("adminVinGrid").innerHTML=rows.filter(x=>x[1]).map(x=>`<div><b>${whiteEscape(x[0])}</b><span>${whiteEscape(x[1])}</span></div>`).join('');$("adminVinMissing").textContent=(out.missing||[]).length?'Не найдено в VIN: '+out.missing.join(' • ')+'. Эти данные можно добавить вручную после импорта.':'';$("adminVinPreview").style.display="block";msg.textContent=`✅ Найдено • автомобиль готов к добавлению`;msg.className="adminSaveMsg ok"}catch(e){adminVinVehicle=null;msg.textContent='Ошибка: '+e.message;msg.className='adminSaveMsg error'}finally{btn.disabled=false;btn.textContent="НАЙТИ АВТОМОБИЛЬ"}}
async function addVinVehicle(){if(!adminVinVehicle)return;const v=adminVinVehicle,btn=$("adminVinAdd"),msg=$("adminVinMsg"),lotNumber=nextAdminLotNumber();btn.disabled=true;btn.textContent="ДОБАВЛЯЮ…";try{await adminApi('/api/admin-create-lot',{lotNumber,make:v.make||'Unknown',model:v.model||'Vehicle',year:v.year,mileage:null,vin:v.vin,specs:'UPCOMING',engine:v.engine||null,fuel:v.fuel||null,transmission:v.transmission||null,drive:v.drive||null,seats:v.seats||null,exteriorColor:null,interiorColor:null,startingBid:0,reservePrice:null,sellerApprovalRequired:false,description:['UPCOMING',v.body,v.trim].filter(Boolean).join(' • ')});msg.textContent=`✅ Автомобиль добавлен как UPCOMING / DRAFT`;msg.className='adminSaveMsg ok';await loadAdminLots();setTimeout(closeVinImport,900)}catch(e){msg.textContent='Ошибка: '+e.message;msg.className='adminSaveMsg error'}finally{btn.disabled=false;btn.textContent='＋ ДОБАВИТЬ В GALAXY AUCTIONS'}}
function renderLotPhotoPreview(){
  const root=$("lotPhotoPreview");root.innerHTML=adminLotFiles.map((f,i)=>`<div class="pitem"><img src="${f.preview}">${i===0?'<span class="primary">MAIN</span>':''}</div>`).join("");
}
async function fileToCompressedDataUrl(file){
  const url=URL.createObjectURL(file);try{
    const img=new Image();await new Promise((ok,bad)=>{img.onload=ok;img.onerror=bad;img.src=url});
    let w=img.naturalWidth,h=img.naturalHeight,max=1600;if(w>max||h>max){const r=Math.min(max/w,max/h);w=Math.round(w*r);h=Math.round(h*r)}
    const c=document.createElement("canvas");c.width=w;c.height=h;const ctx=c.getContext("2d");ctx.drawImage(img,0,0,w,h);return c.toDataURL("image/jpeg",.82);
  }finally{URL.revokeObjectURL(url)}
}
async function chooseLotImages(e){
  const files=[...(e.target.files||[])].slice(0,12);adminLotFiles=[];$("adminLotMsg").textContent="Подготовка фотографий…";
  try{for(let i=0;i<files.length;i++){const dataUrl=await fileToCompressedDataUrl(files[i]);adminLotFiles.push({name:files[i].name||`photo-${i+1}.jpg`,dataUrl,preview:dataUrl})}renderLotPhotoPreview();$("adminLotMsg").textContent=adminLotFiles.length?`Выбрано фото: ${adminLotFiles.length}`:"";$("adminLotMsg").className="adminSaveMsg";}
  catch(err){$("adminLotMsg").textContent="Ошибка фото: "+err.message;$("adminLotMsg").className="adminSaveMsg error";}
}
async function saveAdminLot(){
  const btn=$("adminLotSave"),msg=$("adminLotMsg");
  const payload={make:$("lotMake").value.trim(),model:$("lotModel").value.trim(),year:Number($("lotYear").value)||null,mileage:Number($("lotMileage").value)||null,vin:$("lotVin").value.trim()||null,specs:$("lotSpecs").value.trim()||null,engine:$("lotEngine").value.trim()||null,fuel:$("lotFuel").value.trim()||null,transmission:$("lotTransmission").value.trim()||null,drive:$("lotDrive").value.trim()||null,exteriorColor:$("lotExterior").value.trim()||null,interiorColor:$("lotInterior").value.trim()||null,seats:Number($("lotSeats").value)||null,startingBid:Number($("lotStartingBid").value)||0,reservePrice:$("lotReserve").value?Number($("lotReserve").value):null,sellerApprovalRequired:$("lotSellerApproval").checked,description:$("lotDescription").value.trim()||null};
  if(!payload.make||!payload.model){msg.textContent="Укажи марку и модель";msg.className="adminSaveMsg error";return}
  btn.disabled=true;btn.textContent="СОЗДАЮ LOT…";msg.textContent="";
  try{
    const out=await adminApi("/api/admin-create-lot",payload);const lotId=out.lotId;payload.lotNumber=Number(out.lot?.lot_number||payload.lotNumber);
    for(let i=0;i<adminLotFiles.length;i++){msg.textContent=`Загрузка фото ${i+1} из ${adminLotFiles.length}…`;await adminApi("/api/admin-upload-lot-image",{lotId,lotNumber:payload.lotNumber,dataUrl:adminLotFiles[i].dataUrl,fileName:adminLotFiles[i].name,isPrimary:i===0,sortOrder:i});}
    msg.textContent=`✅ Автомобиль добавлен в «Все»`;msg.className="adminSaveMsg ok";await loadAdminLots();setTimeout(()=>$("adminLotOverlay").classList.remove("open"),900);
  }catch(e){msg.textContent="Ошибка: "+e.message;msg.className="adminSaveMsg error";}
  finally{btn.disabled=false;btn.textContent="ДОБАВИТЬ В «ВСЕ»";}
}
$("adminTabClients").onclick=()=>setAdminView("clients");$("adminTabLots").onclick=()=>setAdminView("lots");$("adminAddLotBtn").onclick=openAddLot;$("adminLotsView")?.querySelectorAll(".adminStatusFilter [data-status]").forEach(b=>b.onclick=()=>{const v=b.dataset.status;$("adminLotFilter").value=v;$("adminLotsView").querySelectorAll(".adminStatusFilter [data-status]").forEach(x=>x.classList.toggle("active",x===b));renderAdminLots();});$("adminLotsReload").onclick=loadAdminLots;$("adminLotManageClose").onclick=$("adminLotManageBack").onclick=()=>$("adminLotManageOverlay").classList.remove("open");$("adminLotManageOverlay").onclick=e=>{if(e.target===$("adminLotManageOverlay"))$("adminLotManageOverlay").classList.remove("open")};$("adminApproveSale").onclick=()=>adminPendingAction("approve");$("adminRejectSale").onclick=()=>adminPendingAction("reject");$("adminLotStartLive").onclick=()=>adminLotAction("live");$("adminLotSchedule").onclick=()=>adminLotAction("upcoming");$("adminLotSaveChanges").onclick=saveManagedLot;$("adminLotArchive").onclick=archiveManagedLot;$("adminLotDelete").onclick=deleteManagedLot;$("adminLotSearch").oninput=renderAdminLots;$("adminLotFilter").onchange=renderAdminLots;$("adminLotClose").onclick=$("adminLotBack").onclick=()=>$("adminLotOverlay").classList.remove("open");$("adminLotOverlay").onclick=e=>{if(e.target===$("adminLotOverlay"))$("adminLotOverlay").classList.remove("open")};$("lotImages").onchange=chooseLotImages;$("adminLotSave").onclick=saveAdminLot;

$("adminQuick").onclick=openAdminPanel;$("adminAccountBtn").onclick=openAdminPanel;$("adminClose").onclick=()=>$("adminOverlay").classList.remove("open");$("adminOverlay").onclick=e=>{if(e.target===$("adminOverlay"))$("adminOverlay").classList.remove("open")};$("adminReload").onclick=loadAdminClients;$("adminSearch").oninput=renderAdminClients;$("adminEditClose").onclick=$("adminEditBack").onclick=()=>$("adminEditOverlay").classList.remove("open");$("adminEditOverlay").onclick=e=>{if(e.target===$("adminEditOverlay"))$("adminEditOverlay").classList.remove("open")};$("adminSave").onclick=saveAdminClient;


function whiteEscape(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function whiteTime(n){n=Math.max(0,Math.ceil(Number(n)||0));return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');}
function whiteIsBonus(){return !closed&&['bonus','green'].includes(String(stateRow?.phase||phase||'').toLowerCase());}
function whiteCarCard(idx, extra=''){
 const q=lots[idx]; if(!q)return '';
 const img=q.photos?.[0]||'';
 return `<button class="myBidCard" data-white-lot="${idx}">${img?`<img src="${whiteEscape(img)}" alt="${whiteEscape(q.title)}">`:''}<div class="bidCardBody"><b>${whiteEscape(q.title)}</b><div class="bidCardAmounts"><strong>${money(Number(q.price||0))}</strong>${extra}</div><small>${whiteEscape(q.meta?.slice(0,2).join(' • ')||'')}</small></div><span class="chevron">›</span></button>`;
}
let myCarsSnapshot={pending:[],tracking:[],documents:[]};
let myCarsRefreshPromise=null;
function updateMyCarsCounters(){
 const favs=getWatchlist().filter(idx=>lots[idx]);
 $('bidCountActive').textContent=String(favs.length);
 $('bidCountWon').textContent=String(myCarsSnapshot.pending.length);
 $('bidCountOutbid').textContent=String(myCarsSnapshot.tracking.length);
 const docs=$('bidCountDocs');if(docs)docs.textContent=String(myCarsSnapshot.documents.length);
 const cars=$('accountCars');if(cars)cars.textContent=String(myCarsSnapshot.pending.length+myCarsSnapshot.tracking.length+myCarsSnapshot.documents.length);
}
async function refreshMyCars(){
 updateMyCarsCounters();
 if(!tg?.initData){myCarsSnapshot={pending:[],tracking:[],documents:[]};updateMyCarsCounters();if($('myBidsScreen')?.classList.contains('open'))whiteRenderBidRows(false);return myCarsSnapshot;}
 if(myCarsRefreshPromise)return myCarsRefreshPromise;
 myCarsRefreshPromise=fetch('/api/my-auction-results?t='+Date.now(),{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify({initData:tg.initData})}).then(async r=>{const out=await r.json();if(!r.ok)throw new Error(out.error||'Results unavailable');const rows=out.results||[];rows.forEach(upsertServerLot);myCarsSnapshot={pending:rows.filter(x=>x.bucket==='pending'||(!x.bucket&&x.status==='pending')),tracking:rows.filter(x=>x.bucket==='tracking'),documents:rows.filter(x=>x.bucket==='documents')};updateMyCarsCounters();if($('myBidsScreen')?.classList.contains('open'))whiteRenderBidRows(false);return myCarsSnapshot;}).catch(e=>{console.warn('My cars refresh',e.message);return myCarsSnapshot;}).finally(()=>{myCarsRefreshPromise=null});
 return myCarsRefreshPromise;
}
function whiteRenderBidRows(requestRefresh=true){
 const favs=getWatchlist().filter(idx=>lots[idx]);updateMyCarsCounters();
 document.querySelectorAll('[data-bid-tab]').forEach(b=>b.classList.toggle('active',b.dataset.bidTab===whiteBidTab));
 let rows=[];
 if(whiteBidTab==='favorites'){$('myBidsList').innerHTML=favs.map(idx=>whiteCarCard(idx,'<span class="myBidStatus win">Избранное</span>')).join('')||'<div class="emptyWatch">❤️ Пока нет избранных авто.<br><small>В списке лотов нажмите звёздочку ☆.</small></div>';}
 else {rows=myCarsSnapshot[whiteBidTab]||[];const empty=whiteBidTab==='pending'?'⏳ Пока нет автомобилей, ожидающих подтверждения.':whiteBidTab==='tracking'?'🚢 Отслеживание пока пусто.':'📄 Документы пока отсутствуют.';$('myBidsList').innerHTML=rows.map(r=>{const idx=lots.findIndex(x=>String(x.id||'')===String(r.id)||Number(x.no)===Number(r.lot_number));const label=whiteBidTab==='pending'?'⏳ Ожидает подтверждения':whiteBidTab==='tracking'?'🚢 Отслеживание':'📄 Документы';return idx>=0?whiteCarCard(idx,`<span class="myBidStatus ${whiteBidTab==='pending'?'':'win'}">${label}${r.amount?' · '+money(r.amount):''}</span>`):''}).join('')||`<div class="emptyWatch">${empty}</div>`;}
 $('myBidsList').querySelectorAll('[data-white-lot]').forEach(el=>el.onclick=()=>openLotDetail(Number(el.dataset.whiteLot)));
 if(requestRefresh)refreshMyCars();
}
function whiteSyncSound(){
 const bell=$('whiteNotifications');
 if(!bell)return;
 bell.setAttribute('aria-pressed',String(soundOn));
 bell.setAttribute('aria-label',soundOn?'Выключить звук Live Auction':'Включить звук Live Auction');
 bell.classList.toggle('soundOn',soundOn);
 bell.innerHTML=soundOn
  ? '<svg aria-hidden="true" class="uiIcon" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 8-3 7-3 9h18c0-2-3-1-3-9M9 20a3 3 0 0 0 6 0"></path></svg>'
  : '<svg aria-hidden="true" class="uiIcon" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" viewBox="0 0 24 24"><path d="M13.73 21a2 2 0 0 1-3.46 0M18.63 18H3c0-2 3-1 3-9 0-.73.13-1.43.37-2.08M8.12 4.45A6 6 0 0 1 18 9c0 2.4.27 4 .7 5.12M3 3l18 18"></path></svg>';
}
function whiteInit(){
 const safe=()=>{const h=tg?.viewportStableHeight||window.innerHeight;document.documentElement.style.setProperty('--app-height',h+'px');document.body.classList.toggle('shortScreen',h<660);};safe();window.addEventListener('resize',safe);tg?.onEvent?.('viewportChanged',safe);
 try{tg?.setHeaderColor?.('#ffffff');tg?.setBackgroundColor?.('#ffffff');}catch(e){}
 $('photoPrev').onclick=()=>setLivePhoto(currentPhotoIndex-1);$('photoNext').onclick=()=>setLivePhoto(currentPhotoIndex+1);
 $('whiteHistory').onclick=()=>{$('whiteHistoryOverlay').hidden=false;};$('whiteCloseHistory').onclick=()=>{$('whiteHistoryOverlay').hidden=true;};$('whiteHistoryOverlay').onclick=e=>{if(e.target===$('whiteHistoryOverlay'))$('whiteHistoryOverlay').hidden=true;};
 $('whiteNotifications').onclick=()=>toggleAuctionSound();
 whiteSyncSound();

 document.querySelectorAll('.whiteInfo').forEach(b=>b.onclick=()=>alert(b.dataset.info));
 document.querySelectorAll('[data-bid-tab]').forEach(b=>b.onclick=()=>{whiteBidTab=b.dataset.bidTab;whiteRenderBidRows();});
}

whiteInit();
// Always render the full 15-lot app immediately, even before Supabase responds.
render();
subscribeAuctionState();
fetchAuctionState().then(()=>{
  start();
  // Fast authoritative sync. Realtime remains primary; this 400 ms snapshot closes
  // reconnect/network gaps and keeps state, BONUS TIME, leader and bids aligned on every phone.
  let snapshotBusy=false;
  setInterval(async()=>{
    if(snapshotBusy)return;snapshotBusy=true;const requestStarted=Date.now();
    try{
      const r=await fetch('/api/live-sync?t='+requestStarted,{cache:'no-store'});
      if(r.ok){const snap=await r.json();syncServerClock(snap.serverNow,requestStarted);
        if(snap.lotStatuses){managedLotStatuses=snap.lotStatuses;renderCatalog();renderWatchlist();} if(snap.startAt){galaxyStartAt=snap.startAt;const al=$("lot");if(al)al.textContent=auctionDateLabel();} if(Array.isArray(snap.todayQueue)){liveTodayQueue=snap.todayQueue.map(Number); const lb=$("lotsBtn");if(lb)lb.textContent=`Лоты (${liveTodayQueue.length}) ›`;renderCatalog();}
        if(snap.state){
          if(snap.lot)upsertServerLot(snap.lot);
          // A fresh lot may intentionally have null current_bid; preserve configured starting price.
          if(snap.state.current_bid==null){const li=lots.findIndex(x=>Number(x.no)===Number(snap.state.lot_id||0));snap.state.current_bid=li>=0?lots[li].price:0;}
          applyAuctionState(snap.state,false);
        }
        if(Array.isArray(snap.bids)){renderRecentBidders(snap.bids);latestLeaderUserId=snap.bids[0]?.user_id?String(snap.bids[0].user_id):null;
          if(tgUser?.id){const mine=snap.bids.find(b=>String(b.user_id)===String(tgUser.id));if(mine){userHasBidThisLot=true;myLatestBidAmount=Number(mine.amount);}}
          updateBidVisualState();
        }
      }
    }catch(e){}finally{snapshotBusy=false;}
  },400);
});

/* LIVE-36: lock only the actual Live Auction and place vehicle title in the right column. */
(function(){
  const title=document.getElementById('title');
  const main=document.querySelector('.main');
  const details=document.getElementById('details');
  if(title&&main){
    title.classList.add('liveVehicleTitle');
    // LIVE-39: vehicle name belongs INSIDE the left specs column, directly above GCC Specs.
    // This removes the full-width title row and lets the right auction card start at the same height.
    const specColumn=document.querySelector('.specColumn');
    if(specColumn){
      specColumn.insertBefore(title, specColumn.firstChild);
    }else if(details&&details.parentNode){
      details.parentNode.insertBefore(title,details);
    }else{
      main.appendChild(title);
    }
  }
  const body=document.body;
  const isLiveAuction=()=>{
    const screenOpen=document.querySelector('.modernScreen.open,.soldScreen.open,.overlay.open,.catalogOverlay.open,.queueOverlay.open,.detailOverlay.open,.accountOverlay.open,.adminOverlay.open,.adminLotOverlay.open,.adminEditOverlay.open');
    return !screenOpen;
  };
  const sync=()=>{
    const lock=isLiveAuction();
    body.classList.toggle('liveViewportLocked',lock);
    if(lock){ window.scrollTo(0,0); document.documentElement.scrollTop=0; body.scrollTop=0; }
  };
  const obs=new MutationObserver(sync);
  document.querySelectorAll('.modernScreen,.soldScreen,.overlay,.catalogOverlay,.queueOverlay,.detailOverlay,.accountOverlay,.adminOverlay,.adminLotOverlay,.adminEditOverlay').forEach(el=>obs.observe(el,{attributes:true,attributeFilter:['class']}));
  document.addEventListener('touchmove',e=>{if(body.classList.contains('liveViewportLocked')&&!e.target.closest?.('.livegrid'))e.preventDefault()},{passive:false});
  document.addEventListener('wheel',e=>{if(body.classList.contains('liveViewportLocked')&&!e.target.closest?.('.livegrid'))e.preventDefault()},{passive:false});
  document.addEventListener('scroll',()=>{if(body.classList.contains('liveViewportLocked')){window.scrollTo(0,0);document.documentElement.scrollTop=0;body.scrollTop=0;}},{passive:true});
  sync();
})();

// HOME-43: compact first screen + working services. Live Auction untouched.
(function(){
  const byId=id=>document.getElementById(id);
  const openServices=()=>{
    if(typeof closeModernScreens==='function') closeModernScreens();
    const s=byId('servicesScreen'); if(s) s.classList.add('open');
  };
  const external=url=>{ window.open(url,'_blank','noopener,noreferrer'); };
  const all=byId('openAllServices'); if(all) all.addEventListener('click',e=>{e.preventDefault();openServices();});
  const close=byId('closeServices'); if(close) close.addEventListener('click',()=>{ if(typeof closeModernScreens==='function') closeModernScreens(); const h=byId('homeScreen'); if(h) h.classList.add('open'); if(typeof setModernActive==='function') setModernActive('home'); });
  const ship=byId('serviceShipping'); if(ship) ship.addEventListener('click',()=>external('https://www.uship.com/vehicles/'));
  const vin=byId('serviceVin'); if(vin) vin.addEventListener('click',()=>external('https://www.carfax.com/vehicle-history-reports/'));
  const customs=byId('serviceCustoms'); if(customs) customs.addEventListener('click',()=>external('https://www.dubaitrade.ae/'));
  const calc=byId('serviceCalculator'); if(calc) calc.addEventListener('click',openServices);
})();

// HOME-44: restore the original 8 internal service tools.
(function(){
  const page=document.getElementById('servicePage'), inner=document.getElementById('servicePageInner');
  if(!page||!inner)return;
  const pages={
    calculator:`<div class="svcHead"><button class="svcBack">‹</button><h1>Калькулятор</h1></div><div class="svcCard"><label class="svcLabel">Стоимость автомобиля (USD)</label><input class="svcInput" value="25000"><label class="svcLabel">Страна доставки</label><select class="svcSelect"><option>ОАЭ (Дубай)</option><option>США</option><option>Канада</option><option>Европа</option></select><button class="svcBtn">Рассчитать</button></div><div class="svcCard"><h2>Примерная стоимость под ключ</h2><div class="svcTotal">$37,500</div><div class="svcRow"><span>Автомобиль</span><b>$25,000</b></div><div class="svcRow"><span>Доставка</span><b>$2,800</b></div><div class="svcRow"><span>Растаможка</span><b>$8,200</b></div><div class="svcRow"><span>Доп. расходы</span><b>$1,500</b></div><p class="svcNote">Предварительный расчёт. Итоговая стоимость может измениться.</p></div>`,
    shipping:`<div class="svcHead"><button class="svcBack">‹</button><h1>Расчёт доставки</h1></div><div class="svcCard"><label class="svcLabel">Откуда</label><select class="svcSelect"><option>Нью-Йорк (США)</option><option>Лос-Анджелес (США)</option></select><label class="svcLabel">Куда</label><select class="svcSelect"><option>Дубай (ОАЭ)</option><option>Абу-Даби (ОАЭ)</option></select><label class="svcLabel">Способ доставки</label><select class="svcSelect"><option>Контейнер</option><option>Ro-Ro</option></select><button class="svcBtn">Рассчитать доставку</button></div><div class="svcCard"><h2>Примерный расчёт</h2><div class="svcTotal">$3,500</div><div class="svcRow"><span>Фрахт</span><b>$2,800</b></div><div class="svcRow"><span>Портовые расходы</span><b>$450</b></div><div class="svcRow"><span>Страхование</span><b>$150</b></div><div class="svcRow"><span>Документы</span><b>$100</b></div></div>`,
    customs:`<div class="svcHead"><button class="svcBack">‹</button><h1>Растаможка</h1></div><div class="svcCard"><label class="svcLabel">Стоимость авто</label><input class="svcInput" value="25000"><label class="svcLabel">Страна назначения</label><select class="svcSelect"><option>ОАЭ</option><option>США</option><option>Канада</option></select><button class="svcBtn">Предварительно рассчитать</button></div>`,
    vin:`<div class="svcHead"><button class="svcBack">‹</button><h1>Проверка VIN</h1></div><div class="svcCard"><label class="svcLabel">VIN автомобиля</label><input class="svcInput" placeholder="Введите VIN"><button class="svcBtn">Проверить VIN</button><p class="svcNote">Здесь будет отображаться история автомобиля и доступные отчёты.</p></div>`,
    tracking:`<div class="svcHead"><button class="svcBack">‹</button><h1>Отслеживание доставки</h1></div><div class="svcCard"><h2>2023 BMW X5 xDrive40i</h2><p class="svcNote">VIN: 5UXCR6C09P8R12345 · <span class="svcGreen">В пути</span></p></div><div class="svcTrack">Нью-Йорк ····· 🚢 ····· Дубай</div><div class="svcCard"><div class="svcRow"><span>✓ Автомобиль выкуплен</span><b>5 апр.</b></div><div class="svcRow"><span>✓ Доставлен на склад</span><b>7 апр.</b></div><div class="svcRow"><span>🚢 В пути по морю</span><b>Сейчас</b></div><div class="svcRow"><span>○ Прибытие в порт</span><b>—</b></div><div class="svcRow"><span>○ Таможня</span><b>—</b></div></div>`,
    documents:`<div class="svcHead"><button class="svcBack">‹</button><h1>Документы</h1></div><div class="svcCard"><div class="svcDoc"><b>Паспорт</b><span>Загружено ›</span></div><div class="svcDoc"><b>Договор</b><span>Загружено ›</span></div><div class="svcDoc"><b>Инвойс</b><span>Загружено ›</span></div><div class="svcDoc"><b>Таможенная декларация</b><span>Ожидается ›</span></div></div>`,
    inspection:`<div class="svcHead"><button class="svcBack">‹</button><h1>Инспекция</h1></div><div class="svcCard"><h2>Проверка автомобиля перед покупкой</h2><p class="svcNote">Выберите автомобиль или укажите VIN. Для тестовой версии здесь показан пример заявки на инспекцию.</p><label class="svcLabel">VIN или номер лота</label><input class="svcInput" placeholder="VIN / № лота"><button class="svcBtn">Заказать инспекцию</button></div>`,
    insurance:`<div class="svcHead"><button class="svcBack">‹</button><h1>Страхование</h1></div><div class="svcCard"><h2>Страхование доставки</h2><p class="svcNote">Предварительный расчёт защиты автомобиля на время перевозки.</p><label class="svcLabel">Стоимость автомобиля (USD)</label><input class="svcInput" value="25000"><button class="svcBtn">Рассчитать страхование</button></div>`
  };
  function open(name){inner.innerHTML=pages[name]||'';page.classList.add('open');inner.querySelector('.svcBack')?.addEventListener('click',()=>page.classList.remove('open'));}
  document.querySelectorAll('[data-service-page]').forEach(b=>b.addEventListener('click',()=>open(b.dataset.servicePage)));
  // Home shortcuts use the same restored internal pages.
  [['serviceCalculator','calculator'],['serviceShipping','shipping'],['serviceCustoms','customs'],['serviceVin','vin']].forEach(([id,n])=>{
    const old=document.getElementById(id); if(!old)return;
    const clone=old.cloneNode(true); old.parentNode.replaceChild(clone,old); clone.addEventListener('click',()=>open(n));
  });
})();

// FINAL-67: verified admin client profile routing + iOS zoom lock.
(function(){
 const overlay=$("adminClientProfileOverlay"); if(overlay){
   $("adminClientProfileBack").onclick=()=>overlay.classList.remove('open');
   $("adminClientProfileEdit").onclick=()=>{if(adminProfileClient){overlay.classList.remove('open');openAdminEditor(adminProfileClient)}};
   document.querySelectorAll('[data-client-profile-tab]').forEach(b=>b.onclick=()=>renderAdminClientProfileTab(b.dataset.clientProfileTab));
 }
 let last=0;
 document.addEventListener('touchend',e=>{const n=Date.now();if(n-last<350 && e.changedTouches?.length===1)e.preventDefault();last=n},{passive:false});
 ['gesturestart','gesturechange','gestureend'].forEach(t=>document.addEventListener(t,e=>e.preventDefault(),{passive:false}));
 document.addEventListener('dblclick',e=>e.preventDefault(),{passive:false});
})();

/* FINAL GALAXY schedule + public preview queue */
function galaxyFormatCountdown(ms){const t=Math.max(0,Math.floor(ms/1000)),h=Math.floor(t/3600),m=Math.floor((t%3600)/60),s=t%60;return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
async function refreshPublicLots(){try{const r=await fetch('/api/public-lots?t='+Date.now(),{cache:'no-store'});if(!r.ok)return;const d=await r.json();(d.lots||[]).forEach(l=>upsertServerLot(l));renderCatalog();renderWatchlist();window.dispatchEvent(new Event('galaxy-public-lots-updated'));}catch(e){}}
refreshPublicLots();setInterval(refreshPublicLots,10000);
setInterval(()=>{if(!stateRow||stateRow.status!=='waiting'||!galaxyStartAt)return;const remain=Math.max(0,new Date(galaxyStartAt).getTime()-serverNowMs()),txt=galaxyFormatCountdown(remain),n=liveTodayQueue.length;const st=$('soundStatus');if(st)st.textContent=`${auctionDateLabel()} · ${lotCountLabel(n)} · через ${txt}`;const ct=$('circleTime');if(ct)ct.textContent=txt;const cl=$('circleLabel');if(cl)cl.textContent='до начала аукциона';},250);


/* Telegram launch intents contain only an opaque lot id or the public route name. */
function decodeLaunchValue(value){try{return decodeURIComponent(atob(String(value||'').replace(/-/g,'+').replace(/_/g,'/')))}catch(e){return ''}}
function readLaunchIntent(){const raw=String(tg?.initDataUnsafe?.start_param||new URLSearchParams(location.search).get('tgWebAppStartParam')||'');if(raw==='live')return {live:true};if(raw.startsWith('lot_'))return {lotId:decodeLaunchValue(raw.slice(4))};return {}}
function applyLaunchIntent(){const intent=readLaunchIntent();if(intent.live){closeModernScreens();document.body.classList.add('telegramLiveLaunch');setModernActive('');window.scrollTo(0,0);return;}registrationReady.finally(openSharedLot);}
/* Share uses one path for the live vehicle and every row in the lot queue. */
function sharedLotUrl(q){const u=new URL('/api/share',window.location.origin);if(q.id)u.searchParams.set('id',q.id);else u.searchParams.set('lot',Number(q.no));return u.toString();}
async function shareLot(idx){
    const q=lots[idx]; if(!q)return;
    const url=sharedLotUrl(q);
    const data={title:q.title,text:`${q.title} · Galaxy Auctions`,url};
    try{
      if(navigator.share){await navigator.share(data);return;}
      if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);alert('Ссылка на автомобиль скопирована');return;}
      window.prompt('Скопируйте ссылку на автомобиль',url);
    }catch(e){if(e?.name!=='AbortError')console.error('Share failed',e);}
  }
  let sharedOpened=false;
  function openSharedLot(){
    if(sharedOpened)return;
    const params=new URLSearchParams(location.search),intent=readLaunchIntent(),id=params.get('lotId')||intent.lotId,no=Number(params.get('lot')||intent.lot||0);
    if(!id&&(!Number.isFinite(no)||!no))return;
    const idx=lots.findIndex(q=>id?String(q.id||'')===id:Number(q.no)===no);
    if(idx<0){if(id)fetch('/api/public-lot?id='+encodeURIComponent(id),{cache:'no-store'}).then(r=>r.ok?r.json():null).then(out=>{if(out?.lot){upsertServerLot(out.lot);openSharedLot();}});return;}
    sharedOpened=true;
    try{
      if(typeof closeModernScreens==='function')closeModernScreens();
      openLotDetail(idx);
    }catch(e){console.error('Could not open shared lot',e);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(openSharedLot,350));
  else setTimeout(openSharedLot,350);
  window.addEventListener('galaxy-public-lots-updated',openSharedLot);

// FINAL-84: Home sales are driven by confirmed SOLD lots, not demo data.
let homeSalesSnapshot={count:0,volume:0,sold:[]};
function homeSalesMoney(v){return '$'+Number(v||0).toLocaleString('en-US',{maximumFractionDigits:0});}
function renderHomeSales(){
 const d=homeSalesSnapshot||{}, sold=Array.isArray(d.sold)?d.sold:[];
 const c=document.getElementById('homeSoldCount'),v=document.getElementById('homeSoldVolume'),m=document.getElementById('homeSalesMode');
 if(c)c.textContent=String(Number(d.count||sold.length||0));if(v)v.textContent=homeSalesMoney(d.volume||0);if(m)m.textContent='LIVE';
 const card=x=>`<button class="homeCarCard" type="button" data-sold-lot="${whiteEscape(x.lot_number)}"><div class="homeCarImg">${x.image?`<img src="${whiteEscape(x.image)}" alt="${whiteEscape([x.make,x.model,x.year].filter(Boolean).join(' '))}">`:''}<span>Продано</span><i>♡</i></div><div class="homeCarBody"><b>${whiteEscape([x.make,x.model,x.year].filter(Boolean).join(' '))}</b><strong>${homeSalesMoney(x.price)}</strong><small>${x.buyer?'🏆 '+whiteEscape(x.buyer):'Подтверждено'}</small></div></button>`;
 const root=document.getElementById('homeSoldCars');if(root)root.innerHTML=sold.length?sold.map(card).join(''):'<div class="emptyWatch">Сегодня подтверждённых продаж пока нет.</div>';
 const grid=document.getElementById('soldTodayGrid');if(grid)grid.innerHTML=sold.length?sold.map(x=>card(x).replace('<button','<article').replace('</button>','</article>')).join(''):'<div class="emptyWatch">Сегодня подтверждённых продаж пока нет.</div>';
 const sub=document.getElementById('soldTodaySub');if(sub)sub.textContent=`LIVE • ${sold.length} авто • ${homeSalesMoney(d.volume||0)}`;
}
async function refreshHomeSales(){try{const r=await fetch('/api/home-sales?t='+Date.now(),{cache:'no-store'});if(!r.ok)return;homeSalesSnapshot=await r.json();renderHomeSales();}catch(e){}}
refreshHomeSales();setInterval(refreshHomeSales,5000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshHomeSales()});

registrationReady.then(()=>refreshMyCars());setInterval(refreshMyCars,10000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshMyCars()});window.addEventListener('galaxy-public-lots-updated',updateMyCarsCounters);
setTimeout(applyLaunchIntent,450);

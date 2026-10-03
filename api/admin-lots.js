const crypto = require('crypto');
function verifyTelegram(initData, botToken){
  const token=String(botToken||'').trim(), raw=String(initData||'');
  if(!token) return {ok:false,error:'Server bot token missing'};
  if(!raw) return {ok:false,error:'Telegram initData missing'};
  const p=new URLSearchParams(raw), hash=p.get('hash');
  if(!hash) return {ok:false,error:'Telegram hash missing'};
  p.delete('hash');
  const data=[...p.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join('\n');
  const secret=crypto.createHmac('sha256','WebAppData').update(token).digest();
  const calc=crypto.createHmac('sha256',secret).update(data).digest('hex');
  try{const a=Buffer.from(calc,'hex'),b=Buffer.from(hash,'hex');if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return {ok:false,error:'Telegram signature mismatch'};}catch{return {ok:false,error:'Telegram signature check failed'};}
  const auth=Number(p.get('auth_date')||0), age=Math.floor(Date.now()/1000)-auth;
  if(!auth) return {ok:false,error:'Telegram auth_date missing'};
  if(age < -300) return {ok:false,error:'Telegram auth_date is in the future'};
  if(age > 604800) return {ok:false,error:'Telegram session expired. Close and reopen Mini App'};
  try{const user=JSON.parse(p.get('user')||'null');if(!user?.id)return {ok:false,error:'Telegram user missing'};return {ok:true,user};}catch{return {ok:false,error:'Telegram user data invalid'};}
}
const base=()=>String(process.env.SUPABASE_URL||'https://exfxcgiuotraszeqefha.supabase.co').replace(/\/$/,'');
const key=()=>process.env.SUPABASE_SERVICE_ROLE_KEY;
async function sfetch(path,opts={}){const k=key();if(!k)throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');return fetch(base()+'/rest/v1/'+path,{...opts,headers:{apikey:k,Authorization:`Bearer ${k}`,'Content-Type':'application/json',...(opts.headers||{})}})}
async function requireAdmin(user){const r=await sfetch(`auction_users?telegram_id=eq.${encodeURIComponent(String(user.id))}&is_admin=eq.true&select=telegram_id`);const a=await r.json();return r.ok&&Array.isArray(a)&&a.length>0;}

const LEGACY=[
[1,'Mercedes-Benz','G63 AMG',2025,10500,75000],[2,'BMW','X7 xDrive40i',2020,101000,15000],[3,'Hyundai','Palisade Calligraphy',2026,0,17000],[4,'Toyota','Camry Limited Hybrid',2026,0,10000],[5,'Mercedes-Benz','G63 AMG',2021,203634,20000],[6,'Toyota','Camry LE',2022,450000,2500],[7,'BMW','X5 xDrive40i M Sport',2023,45607,7000],[8,'Toyota','Land Cruiser VXR Grand Touring',2018,107250,13000],[9,'Toyota','Land Cruiser GXR',2018,135000,5000],[10,'BMW','X5 xDrive50i M Sport',2022,97595,3000],[11,'Toyota','Land Cruiser Adventure',2025,28687,15],[12,'Toyota','Land Cruiser GXR',2018,55000,10],[13,'Lamborghini','Urus Mansory Edition',2020,52000,120000],[14,'Lamborghini','Huracan EVO Spyder',2023,4005,145000],[15,'Lamborghini','Huracan EVO Coupe',2021,14563,250000]
];
async function ensureLegacyLots(){const r=await sfetch('auction_lots?lot_number=lte.15&select=lot_number');if(!r.ok)return;const have=new Set((await r.json()||[]).map(x=>Number(x.lot_number))),missing=LEGACY.filter(x=>!have.has(x[0]));if(!missing.length)return;const rows=missing.map(x=>({lot_number:x[0],make:x[1],model:x[2],year:x[3],mileage:x[4],starting_bid:x[5],status:'upcoming',sort_order:x[0],description:'Original MK Auction lot',updated_at:new Date().toISOString()}));await sfetch('auction_lots',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(rows)})}
module.exports=async(req,res)=>{
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  const vr=verifyTelegram(req.body?.initData,process.env.TELEGRAM_BOT_TOKEN); if(!vr.ok)return res.status(401).json({error:vr.error});
  try{
    if(!await requireAdmin(vr.user)) return res.status(403).json({error:'Admin access required'});
    await ensureLegacyLots();
    const r=await sfetch('auction_lots?select=*,auction_lot_images(id,image_url,is_primary,sort_order)&order=lot_number.asc');
    const rows=await r.json(); if(!r.ok) throw new Error(rows?.message||'Could not load lots');
    const bidsResp=await sfetch('auction_bids?select=lot_id,user_id,username,amount,id&order=id.desc');const allBids=bidsResp.ok?(await bidsResp.json()||[]):[];const byLot={};for(const b of allBids){const k=String(b.lot_id);if(!byLot[k])byLot[k]=[];byLot[k].push(b)};const lots=(rows||[]).map(l=>{const images=(l.auction_lot_images||[]).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));const primary=images.find(x=>x.is_primary)||images[0];delete l.auction_lot_images;const rawDesc=String(l.description||'');const dm=rawDesc.match(/\[\[auction_day:(mon|tue|wed|thu|fri|sat|sun)\]\]/i);const cleanDesc=rawDesc.replace(/\n?\[\[auction_day:(?:mon|tue|wed|thu|fri|sat|sun)\]\]/gi,'').trim()||null;const lb=byLot[String(l.lot_number)]||[],win=lb[0];return {...l,description:cleanDesc,auction_day:dm?dm[1].toLowerCase():null,bid_count:lb.length,winner_user_id:win?.user_id||null,winner_username:win?.username||null,winning_bid:win?.amount||null,images,primary_image:primary?.image_url||(Number(l.lot_number)<=15?`images/lot${Number(l.lot_number)}-1.${[5,7,10,11].includes(Number(l.lot_number))?'jpeg':'webp'}`:null)};});
    res.status(200).json({lots});
  }catch(e){res.status(500).json({error:e.message});}
};

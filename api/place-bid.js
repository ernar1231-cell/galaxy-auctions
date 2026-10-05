const crypto = require('crypto');
function verifyTelegram(initData, botToken){
  const token=String(botToken||'').trim();
  const raw=String(initData||'');
  if(!token) return {ok:false,error:'Server bot token missing'};
  if(!raw) return {ok:false,error:'Telegram initData missing'};
  const p=new URLSearchParams(raw);
  const hash=p.get('hash');
  if(!hash) return {ok:false,error:'Telegram hash missing'};
  p.delete('hash');
  const data=[...p.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join('\n');
  const secret=crypto.createHmac('sha256','WebAppData').update(token).digest();
  const calc=crypto.createHmac('sha256',secret).update(data).digest('hex');
  try{
    const a=Buffer.from(calc,'hex'), b=Buffer.from(hash,'hex');
    if(a.length!==b.length || !crypto.timingSafeEqual(a,b)) return {ok:false,error:'Telegram signature mismatch'};
  }catch{return {ok:false,error:'Telegram signature check failed'};}
  const auth=Number(p.get('auth_date')||0);
  if(!auth) return {ok:false,error:'Telegram auth_date missing'};
  const age=Math.floor(Date.now()/1000)-auth;
  if(age < -300) return {ok:false,error:'Telegram auth_date is in the future'};
  if(age > 604800) return {ok:false,error:'Telegram session expired. Close and reopen Mini App'};
  try{
    const user=JSON.parse(p.get('user')||'null');
    if(!user?.id) return {ok:false,error:'Telegram user missing'};
    return {ok:true,user};
  }catch{return {ok:false,error:'Telegram user data invalid'};}
}

const owners=()=>String(process.env.OWNER_TELEGRAM_IDS||process.env.OWNER_TELEGRAM_ID||'5553776824').split(',').map(x=>x.trim()).filter(Boolean);

async function sfetch(path,opts={}){const url=(process.env.SUPABASE_URL||'https://exfxcgiuotraszeqefha.supabase.co')+'/rest/v1/'+path;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');return fetch(url,{...opts,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',...(opts.headers||{})}})}
module.exports=async(req,res)=>{if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});const vr=verifyTelegram(req.body?.initData,process.env.TELEGRAM_BOT_TOKEN);if(!vr.ok)return res.status(401).json({error:vr.error});const tg=vr.user;try{const lotId=Number(req.body?.lotId),inc=Number(req.body?.increment);if(!Number.isInteger(lotId)||![100,1000,10000].includes(inc))return res.status(400).json({error:'Invalid bid'});let r=await sfetch(`auction_users?telegram_id=eq.${encodeURIComponent(String(tg.id))}&select=telegram_id,username,first_name,last_name,account_status,deposit_amount,bid_limit,is_admin,country,phone_country`);const users=await r.json();if(!r.ok)return res.status(502).json({code:'ACCOUNT_LOOKUP_FAILED',error:'Не удалось загрузить аккаунт. Повторите попытку.'});let u=users?.[0];if(!u)return res.status(403).json({code:'DEPOSIT_REQUIRED',error:'Registration or deposit required'});const st=String(u.account_status||'pending').toLowerCase();if(st==='blocked')return res.status(403).json({code:'BLOCKED',error:'Account blocked'});const deposit=Number(u.deposit_amount||0),accountLimit=Number(u.bid_limit||0),admin=u.is_admin===true||owners().includes(String(tg.id));if(!admin&&st!=='active')return res.status(403).json({code:'BID_NOT_ACTIVE',error:'Bidding permission is not active'});if(!admin&&(!Number.isFinite(accountLimit)||accountLimit<=0))return res.status(403).json({code:'LIMIT_REQUIRED',error:'Bid limit is not configured'});r=await sfetch('auction_state?id=eq.1&select=id,lot_id,current_bid,status,phase');const state=(await r.json())?.[0];if(!r.ok||!state||state.status!=='live'||Number(state.lot_id)!==lotId)return res.status(409).json({error:'Lot is no longer live'});const base=Number(state.current_bid||0),next=base+inc,limit=Number(u.bid_limit||0);if(!admin&&next>limit)return res.status(403).json({code:'LIMIT_EXCEEDED',error:'Bid limit exceeded',bidLimit:limit,nextBid:next});const username=u.username||[u.first_name,u.last_name].filter(Boolean).join(' ')||'Bidder',country=String(u.phone_country||u.country||'').slice(0,2).toUpperCase();r=await sfetch(`auction_bids?lot_id=eq.${lotId}&country=eq.PB&select=id,user_id,username,amount&order=id.desc`);const preRows=r.ok?await r.json():[],latest=new Map();for(const pb of preRows||[]){const k=String(pb.user_id);if(!latest.has(k))latest.set(k,pb)}const proxy=[...latest.values()].map(x=>({...x,amount:Number(x.amount||0)})).sort((x,y)=>y.amount-x.amount||Number(y.id)-Number(x.id))[0]||null;let finalAmount=next,winner={user_id:String(tg.id),username,country};if(proxy&&String(proxy.user_id)!==String(tg.id)&&proxy.amount>=next){finalAmount=Math.min(proxy.amount,next+100);winner={user_id:String(proxy.user_id),username:proxy.username||'Bidder',country:''}}const now=new Date().toISOString();r=await sfetch(`auction_state?id=eq.1&lot_id=eq.${lotId}&status=eq.live`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({current_bid:finalAmount,phase:['bonus','green'].includes(String(state.phase||'').toLowerCase())?'bonus':'red',phase_started_at:now,status:'live',updated_at:now})});const changed=await r.json();if(!r.ok)throw new Error(changed?.message||'State update failed');if(!changed?.length)return res.status(409).json({code:'STALE_STATE',error:'Auction state changed. Refresh and try again.'});r=await sfetch('auction_bids',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({lot_id:lotId,user_id:String(tg.id),username,amount:next,country})});let bids=await r.json();if(!r.ok)throw new Error(bids?.message||'Bid insert failed');let winningBid=bids[0];if(String(winner.user_id)!==String(tg.id)){r=await sfetch('auction_bids',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({lot_id:lotId,user_id:winner.user_id,username:winner.username,amount:finalAmount,country:winner.country})});const counter=await r.json();if(!r.ok)throw new Error(counter?.message||'Proxy bid insert failed');winningBid=counter[0]}res.status(200).json({serverNow:new Date().toISOString(),state:changed[0],bid:winningBid});}catch(e){res.status(500).json({error:e.message});}};

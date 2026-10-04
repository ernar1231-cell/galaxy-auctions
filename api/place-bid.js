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
module.exports=async(req,res)=>{if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});const vr=verifyTelegram(req.body?.initData,process.env.TELEGRAM_BOT_TOKEN);if(!vr.ok)return res.status(401).json({error:vr.error});const tg=vr.user;try{const lotId=Number(req.body?.lotId),inc=Number(req.body?.increment);if(!Number.isInteger(lotId)||![100,1000,10000].includes(inc))return res.status(400).json({error:'Invalid bid'});let r=await sfetch(`auction_users?telegram_id=eq.${encodeURIComponent(String(tg.id))}&select=telegram_id,username,first_name,last_name,account_status,bid_limit,phone_country,country`);const users=await r.json();if(!r.ok)return res.status(502).json({code:'ACCOUNT_LOOKUP_FAILED',error:'Не удалось загрузить аккаунт. Повторите попытку.'});let u=users?.[0];if(!u)return res.status(403).json({code:'DEPOSIT_REQUIRED',error:'Registration or deposit required'});const st=String(u.account_status||'pending').toLowerCase();if(st==='blocked')return res.status(403).json({code:'BLOCKED',error:'Account blocked'});const accountLimit=Number(u.bid_limit||0),admin=owners().includes(String(tg.id));if(!Number.isFinite(accountLimit)||accountLimit<=0||(st!=='active'&&!admin))return res.status(403).json({code:'DEPOSIT_REQUIRED',error:'Deposit activation required'});r=await sfetch('auction_state?id=eq.1&select=id,lot_id,current_bid,status,phase');const state=(await r.json())?.[0];if(!r.ok||!state||state.status!=='live'||Number(state.lot_id)!==lotId)return res.status(409).json({error:'Lot is no longer live'});const base=Number(state.current_bid||0),next=base+inc,limit=Number(u.bid_limit||0);if(next>limit)return res.status(403).json({code:'LIMIT_EXCEEDED',error:'Bid limit exceeded',bidLimit:limit,nextBid:next});const now=new Date().toISOString();r=await sfetch(`auction_state?id=eq.1&lot_id=eq.${lotId}&current_bid=eq.${encodeURIComponent(base)}&status=eq.live`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({current_bid:next,phase:['bonus','green'].includes(String(state.phase||'').toLowerCase())?'bonus':'red',phase_started_at:now,status:'live',updated_at:now})});const changed=await r.json();if(!r.ok)throw new Error(changed?.message||'State update failed');if(!changed?.length)return res.status(409).json({error:'Another bid arrived first. Try again.'});const username=u.username||[u.first_name,u.last_name].filter(Boolean).join(' ')||'Bidder',country=String(u.phone_country||u.country||'').slice(0,2).toUpperCase();r=await sfetch('auction_bids',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({lot_id:lotId,user_id:String(tg.id),username,amount:next,country})});const bids=await r.json();if(!r.ok)throw new Error(bids?.message||'Bid insert failed');res.status(200).json({serverNow:new Date().toISOString(),state:changed[0],bid:bids[0]});}catch(e){res.status(500).json({error:e.message});}};

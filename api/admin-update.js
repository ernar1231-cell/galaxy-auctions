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

async function sfetch(path,opts={}){const url=(process.env.SUPABASE_URL||'https://exfxcgiuotraszeqefha.supabase.co')+'/rest/v1/'+path;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');return fetch(url,{...opts,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',...(opts.headers||{})}})}
module.exports=async(req,res)=>{if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});const vr=verifyTelegram(req.body?.initData,process.env.TELEGRAM_BOT_TOKEN);if(!vr.ok)return res.status(401).json({error:vr.error});const user=vr.user;try{const me=await sfetch(`auction_users?telegram_id=eq.${encodeURIComponent(String(user.id))}&is_admin=eq.true&select=telegram_id,is_admin`);const a=await me.json();if(!me.ok||!a?.length)return res.status(403).json({error:'Admin access required'});const b=req.body||{},target=String(b.targetTelegramId||'');const dep=Number(b.depositAmount),lim=Number(b.bidLimit),status=String(b.status||'pending').toLowerCase(),method=String(b.method||'cash').slice(0,40),note=b.note?String(b.note).slice(0,500):null;if(!target||!Number.isFinite(dep)||dep<0||!Number.isFinite(lim)||lim<0||!['pending','active','blocked'].includes(status))return res.status(400).json({error:'Invalid client data'});const now=new Date().toISOString();const r=await sfetch(`auction_users?telegram_id=eq.${encodeURIComponent(target)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({deposit_amount:dep,deposit_method:method,bid_limit:lim,account_status:status,deposit_updated_at:now,updated_at:now})});const rows=await r.json();if(!r.ok||!rows?.length)throw new Error(rows?.message||'User not found');const h=await sfetch('deposit_history',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({telegram_id:target,amount:dep,bid_limit:lim,method,note})});if(!h.ok){const t=await h.text();throw new Error('Saved user, but history failed: '+t)}res.status(200).json({user:rows[0]});}catch(e){res.status(500).json({error:e.message});}};

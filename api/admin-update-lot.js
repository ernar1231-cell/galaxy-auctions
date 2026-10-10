const crypto=require('crypto');
function verify(initData,token){const p=new URLSearchParams(String(initData||'')),h=p.get('hash');if(!token||!h)return null;p.delete('hash');const d=[...p.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join('\n'),s=crypto.createHmac('sha256','WebAppData').update(token).digest(),c=crypto.createHmac('sha256',s).update(d).digest('hex');try{if(!crypto.timingSafeEqual(Buffer.from(c,'hex'),Buffer.from(h,'hex')))return null;return JSON.parse(p.get('user')||'null')}catch{return null}}
const base=()=>String(process.env.SUPABASE_URL||'https://exfxcgiuotraszeqefha.supabase.co').replace(/\/$/,'');const key=()=>process.env.SUPABASE_SERVICE_ROLE_KEY;async function sf(path,o={}){const k=key();if(!k)throw Error('SUPABASE_SERVICE_ROLE_KEY is not configured');return fetch(base()+'/rest/v1/'+path,{...o,headers:{apikey:k,Authorization:`Bearer ${k}`,'Content-Type':'application/json',...(o.headers||{})}})}
module.exports=async(req,res)=>{if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});const u=verify(req.body?.initData,process.env.TELEGRAM_BOT_TOKEN);if(!u?.id)return res.status(401).json({error:'Telegram authorization failed'});try{let r=await sf(`auction_users?telegram_id=eq.${encodeURIComponent(String(u.id))}&is_admin=eq.true&select=telegram_id`);if(!r.ok||!(await r.json()).length)return res.status(403).json({error:'Admin access required'});const b=req.body||{},id=String(b.lotId||'');r=await sf(`auction_lots?id=eq.${encodeURIComponent(id)}&select=status,description,lot_number`);const old=(await r.json())?.[0];if(!old)return res.status(404).json({error:'Lot not found'});const direction=b.direction==null?null:String(b.direction);
if(direction!==null&&!['usa','dubai','transfer'].includes(direction))return res.status(400).json({error:'Invalid direction'});
if(direction!==null){
 const current=String(old.description||'').match(/\[GALAXY_DIRECTION:(\{[^\n]*\})\]/);
 let oldDirection='usa';try{oldDirection=current?JSON.parse(current[1]).direction||'usa':'usa'}catch{}
 if(direction!==oldDirection){
  if(['live','pending','sold'].includes(String(old.status).toLowerCase()))return res.status(409).json({error:'Cannot move a live or completed lot'});
  const bids=await sf('auction_bids?lot_id=eq.'+encodeURIComponent(String(old.lot_number))+'&select=id&limit=1');
  if(!bids.ok)return res.status(502).json({error:'Could not verify existing bids'});
  if((await bids.json()).length)return res.status(409).json({error:'Cannot move a lot with bids'});
 }
}
const patch={make:String(b.make||'').trim(),model:String(b.model||'').trim(),year:b.year==null?null:Number(b.year),mileage:b.mileage==null?null:Number(b.mileage),vin:b.vin||null,starting_bid:Number(b.startingBid||0),description:(()=>{
 const raw=String(old.description||'');
 const tag=raw.match(/\[GALAXY_DIRECTION:\{[^\n]*\}\]/);
 const edited=String(b.description||'').replace(/\[GALAXY_DIRECTION:\{[^\n]*\}\]/g,'').trim();
 const metadata=direction===null?(tag?.[0]||''):'[GALAXY_DIRECTION:'+JSON.stringify({direction})+']';
 return [edited,metadata].filter(Boolean).join('\n')||null;
})(),updated_at:new Date().toISOString()};if(!patch.make||!patch.model)return res.status(400).json({error:'Марка и модель обязательны'});r=await sf(`auction_lots?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(patch)});const rows=await r.json();if(!r.ok)throw Error(rows?.message||'Could not update lot');if(direction!==null){const number=Number(old.lot_number);const assignment=await sf('galaxy_auction_lot_assignments?on_conflict=lot_number',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({lot_number:number,direction,queue_position:number,updated_at:new Date().toISOString()})});if(!assignment.ok)return res.status(502).json({error:'Lot saved, but queue assignment failed. Retry saving.'});}
res.status(200).json({lot:rows[0]})}catch(e){res.status(500).json({error:e.message})}}

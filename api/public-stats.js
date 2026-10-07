const SUPABASE_URL='https://exfxcgiuotraszeqefha.supabase.co';
function dubaiDayStartUtc(now=new Date()){const dubai=new Date(now.getTime()+4*3600000);return new Date(Date.UTC(dubai.getUTCFullYear(),dubai.getUTCMonth(),dubai.getUTCDate())-4*3600000).toISOString()}
async function exactCount(key,query=''){const r=await fetch(`${SUPABASE_URL}/rest/v1/auction_users?select=telegram_id${query}`,{headers:{apikey:key,Authorization:`Bearer ${key}`,Prefer:'count=exact',Range:'0-0'}});if(!r.ok)throw new Error(await r.text());const m=(r.headers.get('content-range')||'').match(/\/(\d+)$/);if(m)return Number(m[1]);const rows=await r.json();return Array.isArray(rows)?rows.length:0}
module.exports=async(req,res)=>{
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)return res.status(500).json({error:'Server database key missing'});
 try{const dayStart=dubaiDayStartUtc();const [registeredUsers,registeredToday]=await Promise.all([exactCount(key),exactCount(key,'&created_at=gte.'+encodeURIComponent(dayStart))]);res.setHeader('Cache-Control','no-store');return res.status(200).json({registeredUsers,registeredToday,dayStart,timeZone:'Asia/Dubai'})}
 catch(e){return res.status(500).json({error:String(e.message||e)})}
};
module.exports.dubaiDayStartUtc=dubaiDayStartUtc;

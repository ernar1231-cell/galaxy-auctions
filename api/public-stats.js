const SUPABASE_URL='https://exfxcgiuotraszeqefha.supabase.co';
function dubaiDayStartUtc(now=new Date()){const dubai=new Date(now.getTime()+4*3600000);return new Date(Date.UTC(dubai.getUTCFullYear(),dubai.getUTCMonth(),dubai.getUTCDate())-4*3600000).toISOString()}
function completed(u){
 const address=u.residence_address;
 const hasAddress=typeof address==='string'?!!address.trim():address&&typeof address==='object'&&Object.values(address).some(v=>typeof v==='string'&&v.trim());
 return !!(String(u.full_name||'').trim()&&String(u.phone||'').trim()&&String(u.phone_country||'').trim()&&String(u.email||'').trim()&&hasAddress);
}
async function completedRegistrations(key){
 const rows=[];let offset=0;
 for(;;){
  const r=await fetch(`${SUPABASE_URL}/rest/v1/auction_users?select=full_name,phone,phone_country,email,residence_address,created_at&order=created_at.asc&offset=${offset}&limit=1000`,{headers:{apikey:key,Authorization:`Bearer ${key}`}});
  if(!r.ok)throw new Error('Could not count registrations');
  const batch=await r.json();if(!Array.isArray(batch))throw Error('Invalid registration response');
  rows.push(...batch);if(batch.length<1000)break;offset+=1000;
 }
 return rows.filter(completed);
}
module.exports=async(req,res)=>{
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)return res.status(500).json({error:'Server database key missing'});
 try{const dayStart=dubaiDayStartUtc();const users=await completedRegistrations(key);const registeredUsers=users.length;const registeredToday=users.filter(u=>u.created_at&&u.created_at>=dayStart).length;const morningCount=registeredUsers-registeredToday;res.setHeader('Cache-Control','no-store');return res.status(200).json({registeredUsers,registeredToday,morningCount,dayStart,timeZone:'Asia/Dubai'})}
 catch(e){return res.status(500).json({error:String(e.message||e)})}
};
module.exports.dubaiDayStartUtc=dubaiDayStartUtc;

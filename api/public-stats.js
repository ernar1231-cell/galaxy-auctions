const {isCompleteRegistration}=require('./_registration-complete');
const SUPABASE_URL='https://exfxcgiuotraszeqefha.supabase.co';
function dubaiDayStartUtc(now=new Date()){const dubai=new Date(now.getTime()+4*3600000);return new Date(Date.UTC(dubai.getUTCFullYear(),dubai.getUTCMonth(),dubai.getUTCDate())-4*3600000).toISOString()}
async function completedUsers(key){
 const all=[];let offset=0;
 while(true){
  const r=await fetch(`${SUPABASE_URL}/rest/v1/auction_users?select=full_name,phone,phone_country,email,residence_address,created_at&order=created_at.asc&limit=1000&offset=${offset}`,{headers:{apikey:key,Authorization:`Bearer ${key}`}});
  if(!r.ok)throw Error('Unable to read registrations');
  const rows=await r.json();if(!Array.isArray(rows))throw Error('Invalid registrations response');
  all.push(...rows);if(rows.length<1000)break;offset+=1000;
 }
 return all;
}
module.exports=async(req,res)=>{
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)return res.status(500).json({error:'Server database key missing'});
 try{const dayStart=dubaiDayStartUtc();const users=await completedUsers(key);const complete=users.filter(isCompleteRegistration);const registeredUsers=complete.length;const registeredToday=complete.filter(u=>u.created_at&&u.created_at>=dayStart).length;const visitorsTotal=users.length;const incompleteVisitors=visitorsTotal-registeredUsers;res.setHeader('Cache-Control','no-store');return res.status(200).json({registeredUsers,registeredToday,visitorsTotal,incompleteVisitors,dayStart,timeZone:'Asia/Dubai'})}
 catch(e){return res.status(500).json({error:String(e.message||e)})}
};
module.exports.dubaiDayStartUtc=dubaiDayStartUtc;

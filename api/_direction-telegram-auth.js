'use strict';
const crypto=require('crypto');
function verifyTelegram(raw,token){
 if(!raw||!token)return null;
 const p=new URLSearchParams(String(raw)),hash=p.get('hash');
 if(!hash||!/^[a-f0-9]{64}$/i.test(hash))return null;
 p.delete('hash');
 const data=[...p.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+'='+v).join('\n');
 const secret=crypto.createHmac('sha256','WebAppData').update(String(token)).digest();
 const expected=crypto.createHmac('sha256',secret).update(data).digest();
 if(!crypto.timingSafeEqual(expected,Buffer.from(hash,'hex')))return null;
 const auth=Number(p.get('auth_date')),age=Math.floor(Date.now()/1000)-auth;
 if(!Number.isFinite(age)||age< -300||age>86400)return null;
 try{const u=JSON.parse(p.get('user')||'null');return u&&u.id?String(u.id):null;}catch{return null;}
}
module.exports={verifyTelegram};

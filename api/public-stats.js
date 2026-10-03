const SUPABASE_URL='https://exfxcgiuotraszeqefha.supabase.co';
module.exports=async(req,res)=>{
  if(req.method!=='GET') return res.status(405).json({error:'Method not allowed'});
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!key) return res.status(500).json({error:'Server database key missing'});
  try{
    const r=await fetch(`${SUPABASE_URL}/rest/v1/auction_users?select=telegram_id`,{headers:{apikey:key,Authorization:`Bearer ${key}`,Prefer:'count=exact',Range:'0-0'}});
    if(!r.ok) throw new Error(await r.text());
    const cr=r.headers.get('content-range')||'';
    const m=cr.match(/\/(\d+)$/);
    let count=m?Number(m[1]):null;
    if(!Number.isFinite(count)){const rows=await r.json();count=Array.isArray(rows)?rows.length:0;}
    res.setHeader('Cache-Control','no-store');
    return res.status(200).json({registeredUsers:count});
  }catch(e){return res.status(500).json({error:String(e.message||e)});}
};

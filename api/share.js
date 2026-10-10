const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const base=()=>String(process.env.SUPABASE_URL||'https://exfxcgiuotraszeqefha.supabase.co').replace(/\/$/,'');
const key=()=>process.env.SUPABASE_SERVICE_ROLE_KEY;
async function sf(path){const k=key();if(!k)throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');return fetch(base()+'/rest/v1/'+path,{headers:{apikey:k,Authorization:`Bearer ${k}`}})}
function orderedImages(images){return (images||[]).filter(x=>x&&x.image_url).sort((a,b)=>(Number(a.sort_order)||0)-(Number(b.sort_order)||0));}
function launchToken(id){return Buffer.from(String(id),'utf8').toString('base64url')}
module.exports=async(req,res)=>{
  const id=String(req.query.id||'').trim(), lot=Number(req.query.lot||0);
  if(!id&&(!Number.isInteger(lot)||lot<=0))return res.status(400).send('Invalid lot');
  const filter=id?`id=eq.${encodeURIComponent(id)}`:`lot_number=eq.${lot}`;
  const r=await sf(`auction_lots?${filter}&select=id,lot_number,make,model,year,mileage,fuel,transmission,drive,starting_bid,auction_lot_images(image_url,sort_order)&limit=1`);
  const row=(await r.json())?.[0];if(!r.ok||!row)return res.status(404).send('Lot not found');
  const title=[row.make,row.model,row.year].filter(Boolean).join(' '),price=Number(row.starting_bid||0);
  const meta=[row.mileage==null?null:`${Number(row.mileage).toLocaleString('en-US')} миль`,row.fuel,row.transmission,row.drive].filter(Boolean).join(' · ');
  const proto=(req.headers['x-forwarded-proto']||'https').split(',')[0];
  const host=req.headers['x-forwarded-host']||req.headers.host;
  const origin=`${proto}://${host}`;
  const fallback=`${origin}/?lotId=${encodeURIComponent(row.id)}`;
  const bot=String(process.env.TELEGRAM_BOT_USERNAME||'GalaxyAuctionbot').replace(/^@/,'').trim();
  const target=bot?`https://t.me/${encodeURIComponent(bot)}?start=lot_${launchToken(row.id)}`:fallback;
  const rawImage=orderedImages(row.auction_lot_images)[0]?.image_url;
  const image=rawImage?new URL(rawImage,origin).toString():null;
  const desc=`Лот ${String(row.lot_number).padStart(3,'0')} · Starting bid $${price.toLocaleString('en-US')}${meta?' · '+meta:''}`;
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.setHeader('Cache-Control','public, max-age=0, s-maxage=300');
  const imageMeta=image?`<meta property="og:image" content="${esc(image)}"><meta property="og:image:secure_url" content="${esc(image)}"><meta name="twitter:image" content="${esc(image)}">`:'';
  res.end(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} · Galaxy Auctions</title><meta name="description" content="${esc(desc)}"><meta property="og:type" content="website"><meta property="og:site_name" content="Galaxy Auctions"><meta property="og:title" content="${esc(title)} · Galaxy Auctions"><meta property="og:description" content="${esc(desc)}">${imageMeta}<meta property="og:url" content="${esc(origin+'/api/share?id='+encodeURIComponent(row.id))}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)} · Galaxy Auctions"><meta name="twitter:description" content="${esc(desc)}"><link rel="canonical" href="${esc(origin+'/api/share?id='+encodeURIComponent(row.id))}"></head><body style="font-family:system-ui;background:#f5f6f8;margin:0;padding:24px"><main style="max-width:520px;margin:auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px #0001">${image?`<img src="${esc(image)}" alt="${esc(title)}" style="width:100%;display:block;aspect-ratio:16/10;object-fit:cover">`:''}<div style="padding:20px"><h1 style="font-size:22px;margin:0 0 8px">${esc(title)}</h1><p style="color:#667085;margin:0 0 18px">${esc(desc)}</p><a href="${esc(target)}" style="display:block;text-align:center;background:#168acd;color:#fff;text-decoration:none;font-weight:700;padding:14px;border-radius:12px">Открыть в Telegram</a></div></main></body></html>`);
};

module.exports.launchToken=launchToken;

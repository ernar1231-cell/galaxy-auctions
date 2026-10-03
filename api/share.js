const lots = {
'001':['Mercedes-Benz G63 AMG 2025',75000,'10,500 km · Petrol · Automatic · 4WD'],
'002':['BMW X7 xDrive40i 2020',15000,'101,000 km · Petrol · Automatic · AWD'],
'003':['Hyundai Palisade Calligraphy 2026',17000,'0 km · Petrol · Automatic · SUV'],
'004':['Toyota Camry Limited 2026 Hybrid',10000,'0 km · Hybrid · Automatic · Sedan'],
'005':['Mercedes-Benz G63 AMG 2021',20000,'203,634 km · Gasoline · Automatic · AWD'],
'006':['Toyota Camry LE 2022',2500,'450,000 km · Hybrid · Automatic · Sedan'],
'007':['BMW X5 xDrive40i M Sport 2023',7000,'45,607 km · Petrol · Automatic · SUV'],
'008':['Toyota Land Cruiser VXR Grand Touring 2018',13000,'107,250 km · Petrol · Automatic · SUV'],
'009':['Toyota Land Cruiser GXR 2018',5000,'135,000 km · Petrol · Automatic · SUV'],
'010':['BMW X5 xDrive50i M Sport 2022',3000,'97,595 km · Petrol · Automatic · SUV'],
'011':['Toyota Land Cruiser Adventure 2025',15,'28,687 km · Petrol · Automatic · SUV'],
'012':['Toyota Land Cruiser GXR 2018',10,'55,000 km · Diesel · Automatic · SUV'],
'013':['Lamborghini Urus Mansory Edition 2020',120000,'52,000 km · Petrol · Automatic · SUV'],
'014':['Lamborghini Huracan EVO Spyder 2023',145000,'4,005 km · Petrol · Automatic · Convertible'],
'015':['Lamborghini Huracan EVO Coupe 2021',250000,'14,563 km · Petrol · Automatic · Coupe']
};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
module.exports=(req,res)=>{
  let lot=String(req.query.lot||'001').padStart(3,'0'); if(!lots[lot]) lot='001';
  const [title,price,meta]=lots[lot];
  const proto=(req.headers['x-forwarded-proto']||'https').split(',')[0];
  const host=req.headers['x-forwarded-host']||req.headers.host;
  const base=`${proto}://${host}`;
  const target=`${base}/?lot=${encodeURIComponent(lot)}`;
  const image=`${base}/share-previews/lot${lot}.jpg`;
  const desc=`Лот ${lot} · Текущая ставка $${Number(price).toLocaleString('en-US')} · ${meta}`;
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.setHeader('Cache-Control','public, max-age=0, s-maxage=300');
  res.end(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} · Galaxy Auctions</title><meta name="description" content="${esc(desc)}"><meta property="og:type" content="website"><meta property="og:site_name" content="Galaxy Auctions"><meta property="og:title" content="${esc(title)} · Galaxy Auctions"><meta property="og:description" content="${esc(desc)}"><meta property="og:image" content="${esc(image)}"><meta property="og:image:secure_url" content="${esc(image)}"><meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:url" content="${esc(base+'/api/share?lot='+lot)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)} · Galaxy Auctions"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${esc(image)}"><link rel="canonical" href="${esc(target)}"><meta http-equiv="refresh" content="0;url=${esc(target)}"></head><body><p><a href="${esc(target)}">Открыть ${esc(title)} в Galaxy Auctions</a></p><script>location.replace(${JSON.stringify(target)})<\/script></body></html>`);
};

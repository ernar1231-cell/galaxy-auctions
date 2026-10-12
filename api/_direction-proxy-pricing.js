'use strict';
// Pure proxy price calculation. No writes or access to USA LIVE.
// Equal maxima: the earlier recorded proxy takes precedence.
function calculateProxyPrice(maxima,startingBid,increment=100){
 if(!Number.isFinite(startingBid)||startingBid<0||!Number.isFinite(increment)||increment<=0)throw Error('Invalid price');
 const entries=(maxima||[]).map(x=>({userId:String(x.userId??''),maximum:Number(x.maximum),createdAt:String(x.createdAt||''),id:Number(x.id||0)}))
  .filter(x=>x.userId&&x.userId!=='undefined'&&Number.isFinite(x.maximum)&&x.maximum>=startingBid)
  .sort((a,b)=>b.maximum-a.maximum||a.createdAt.localeCompare(b.createdAt)||a.id-b.id);
 const leader=entries[0]||null,runnerUp=entries.find(x=>x.userId!==leader?.userId)||null;
 if(!leader)return {leader:null,price:startingBid,runnerUp:null};
 if(!runnerUp)return {leader:leader.userId,price:startingBid,runnerUp:null};
 return {leader:leader.userId,runnerUp:runnerUp.userId,price:Math.min(leader.maximum,Math.max(startingBid,runnerUp.maximum+increment))};
}
module.exports={calculateProxyPrice};

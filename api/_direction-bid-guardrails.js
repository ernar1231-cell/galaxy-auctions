'use strict';
// Shared fail-closed eligibility and price rules for Dubai and Transit only.
// This is a pure helper: caller MUST verify signed Telegram initData server-side
// and persist bid + resulting price atomically before acknowledging a bid.
const ALLOWED=new Set(['dubai','transfer']);
const PHASES=new Set(['red','green','bonus']);
function assertBidRequest({direction,session,lotNumber,actor,mode,amount,currentLeader}){
 if(!ALLOWED.has(direction)||session?.direction!==direction)throw Error('DIRECTION_FORBIDDEN');
 if(session.enabled!==true||!PHASES.has(session.phase)||Number(session.current_lot_number)!==Number(lotNumber))throw Error('AUCTION_NOT_OPEN');
 if(!actor||actor.active!==true||actor.canBid!==true||!actor.telegramVerified)throw Error('BIDDER_NOT_ELIGIBLE');
 if(!['plus100','plus1000','proxy'].includes(mode))throw Error('INVALID_BID_MODE');
 const price=Number(session.current_bid);
 if(!Number.isSafeInteger(price)||price<0)throw Error('INVALID_CURRENT_PRICE');
 if(mode==='proxy'){
  if(!Number.isSafeInteger(amount)||amount<price+100)throw Error('INVALID_PROXY_MAX');
 }else{
  if(currentLeader!=null&&String(currentLeader)===String(actor.telegramId))throw Error('ALREADY_LEADING');
  if(amount!==price+(mode==='plus100'?100:1000))throw Error('INVALID_INCREMENT');
 }
 return {direction,lotNumber:Number(lotNumber),mode,amount,telegramId:String(actor.telegramId)};
}
function assertTestSettlement({direction,mode}){
 if(!ALLOWED.has(direction)||mode!=='nonbinding_test')throw Error('SALE_DISABLED');
 return Object.freeze({salePermitted:false,paymentPermitted:false,purchaseObligation:false});
}
module.exports={assertBidRequest,assertTestSettlement};

'use strict';
const {selectDirectionQueue}=require('./_multi-auction-core');
// Pure next-lot selector. Only assigned, eligible lots from the same direction.
function nextDirectionLot(lots,assignments,direction,currentLotNumber){
 if(!['dubai','transfer'].includes(direction))return null;
 const queue=selectDirectionQueue(lots,assignments,direction);
 const current=queue.findIndex(x=>Number(x.lot_number)===Number(currentLotNumber));
 if(current<0||current+1>=queue.length)return null;
 return queue[current+1];
}
module.exports={nextDirectionLot};

'use strict';
// Fail-closed adapter between real catalog lot numbers and isolated staging positions.
function stagingPosition(direction,lotNumber,mapping){
 if(!['dubai','transfer'].includes(direction))throw Error('INVALID_DIRECTION');
 if(!Number.isSafeInteger(lotNumber)||lotNumber<=0)throw Error('INVALID_LOT');
 const entries=mapping?.[direction];
 if(!Array.isArray(entries))throw Error('STAGING_MAPPING_MISSING');
 const found=entries.filter(x=>x&&x.lotNumber===lotNumber&&Number.isSafeInteger(x.position)&&x.position>0);
 if(found.length!==1)throw Error('STAGING_LOT_NOT_MAPPED');
 return found[0].position;
}
module.exports={stagingPosition};

'use strict';
// Shared direction classification for future isolated auction queues.
// Legacy cars without a direction belong to the original USA auction.
const DIRECTIONS=Object.freeze(['usa','dubai','transfer']);
function directionOf(lot){
 const desc=String(lot?.description||'');
 const match=desc.match(/\[GALAXY_DIRECTION:(\{[^\n]*\})\]/);
 if(!match)return 'usa';
 try{const parsed=JSON.parse(match[1]);return DIRECTIONS.includes(parsed.direction)?parsed.direction:'usa'}catch{return 'usa'}
}
function publishedInDirection(lots,direction){
 if(!DIRECTIONS.includes(direction))throw new Error('Invalid direction');
 return (lots||[]).filter(lot=>['upcoming','live'].includes(String(lot.status||'').toLowerCase())&&directionOf(lot)===direction);
}
module.exports={DIRECTIONS,directionOf,publishedInDirection};

const assert=require('node:assert/strict');
const {nextAuctionTime,formatAuctionTime,pluralizeLots}=require('../auction-schedule');

assert.equal(nextAuctionTime('2026-10-03T17:35:40Z').toISOString(),'2026-10-03T18:00:00.000Z'); // 21:35 -> 22:00 Dubai
assert.equal(nextAuctionTime('2026-10-03T19:59:59Z').toISOString(),'2026-10-03T20:00:00.000Z'); // 23:59 -> 00:00 Dubai
assert.equal(formatAuctionTime('2026-10-03T18:00:00Z','2026-10-03T17:35:00Z'),'Сегодня · 3 октября · 22:00');
assert.equal(formatAuctionTime('2026-10-03T20:00:00Z','2026-10-03T17:35:00Z'),'Завтра · 4 октября · 00:00');
assert.equal(formatAuctionTime('2026-10-04T21:00:00Z','2026-10-03T17:35:00Z'),'5 октября · 01:00');
assert.deepEqual([1,2,3,4,5,11,12,14,21,22,25].map(pluralizeLots),['1 лот','2 лота','3 лота','4 лота','5 лотов','11 лотов','12 лотов','14 лотов','21 лот','22 лота','25 лотов']);
console.log('auction schedule and Russian lot forms: ok');

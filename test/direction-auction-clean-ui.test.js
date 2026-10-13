'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const ui=fs.readFileSync(path.join(root,'direction-auction-clean-ui.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
test('clean UI is limited to Dubai and Transit and keeps simulation disclosure',()=>{
 assert.match(ui,/title\.includes\('Дубай'\)\|\|title\.includes\('пути'\)/);
 assert.match(ui,/СИМУЛЯЦИЯ · БЕЗ ПОКУПКИ/);
 assert.match(ui,/directionPublicHistory/);
 assert.match(ui,/directionPublicResult/);
 assert.doesNotMatch(ui,/\/api\/|fetch\(/);
 assert.match(html,/direction-auction-clean-ui\.js\?v=278/);
});

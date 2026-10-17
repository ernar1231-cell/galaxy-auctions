'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('desktop styles are loaded only at laptop widths',()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
 assert.ok(html.includes('desktop-live.css?v=1'));
 assert.ok(html.includes('media="screen and (min-width: 900px)"'));
 const css=fs.readFileSync(require.resolve('../desktop-live.css'),'utf8');
 assert.ok(css.includes('@media screen and (min-width:900px)'));
 assert.ok(css.includes('grid-template-columns:'));
 assert.ok(css.includes('.livegrid>.bidcol'));
});
test('desktop browser is not forced into Telegram',()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
 assert.ok(html.includes("window.matchMedia('(max-width: 899px)').matches"));
});

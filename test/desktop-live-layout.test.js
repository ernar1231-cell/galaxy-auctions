'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('desktop styles are loaded only at laptop widths',()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
 assert.ok(html.includes('desktop-live.css?v=2'));
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

test('desktop uses existing trade controls and restores mobile DOM',()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
 const js=fs.readFileSync(require.resolve('../desktop-live-layout.js'),'utf8');
 const vm=require('node:vm');
 assert.doesNotThrow(()=>new vm.Script(js));
 assert.ok(html.includes('desktop-live-layout.js?v=2'));
 assert.ok(js.includes("document.getElementById('tradeControls')"));
 assert.ok(js.includes("controls.classList.remove('desktopTradeControls')"));
 assert.ok(js.includes('anchor.parentNode.insertBefore(controls,anchor.nextSibling)'));
});

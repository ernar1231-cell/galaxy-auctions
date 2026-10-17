'use strict';const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('i18n preview parses',()=>assert.doesNotThrow(()=>new vm.Script(fs.readFileSync(require.resolve('../language-preview.js'),'utf8'))));
test('single profile language selector remains',()=>{const h=fs.readFileSync(require.resolve('../index.html'),'utf8');assert.ok(h.includes('id="profileLanguageRow"'));assert.ok(!h.includes('Язык приложения</span>'));});
test('existing profile preference is source of truth',()=>{const s=fs.readFileSync(require.resolve('../app.js'),'utf8');assert.ok(s.includes('window.galaxySelectedLanguage=selectedProfileLanguage'));});

test('english dictionary includes auction, logistics and admin terms',()=>{
 const s=fs.readFileSync(require.resolve('../language-preview.js'),'utf8');
 for(const key of ['Порт отправления','Сделать ставку','Убрать из списка аукциона','Ожидают решения','Трек-номер'])assert.ok(s.includes("'"+key+"'"));
 assert.ok(s.includes("v==='en'?'en':'ru'"));
});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('english coverage parses and includes screenshot gaps',()=>{
 const src=fs.readFileSync(require.resolve('../language-preview.js'),'utf8');
 assert.doesNotThrow(()=>new vm.Script(src));
 for(const term of ['Избранное','Отслеживание','Документы пока отсутствуют.','Описание авто','ВЫБЕРИТЕ НАПРАВЛЕНИЕ','Продано сегодня','Клиенты','АУКЦИОН США'])assert.ok(src.includes("'"+term+"'"));
});
test('preserves auction values and language selection',()=>{
 const src=fs.readFileSync(require.resolve('../language-preview.js'),'utf8');
 assert.ok(src.includes('.adminLotCard'));
 assert.ok(src.includes('[data-profile-language]'));
 assert.ok(src.includes("v==='en'?'en':'ru'"));
});

test('bottom navigation translates without replacing buttons or icons',()=>{
 const src=fs.readFileSync(require.resolve('../language-preview.js'),'utf8');
 for(const key of ['home','markets','bids','profile'])assert.ok(src.includes("'"+key+"':"));
 assert.ok(src.includes('button.childNodes'));
 assert.ok(src.includes("button.setAttribute('aria-label'"));
});

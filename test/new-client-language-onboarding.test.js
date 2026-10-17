'use strict';const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('new client selects language after registration',()=>{
 const app=fs.readFileSync(require.resolve('../app.js'),'utf8');
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
 assert.doesNotThrow(()=>new vm.Script(app));
 assert.ok(html.includes('id="newClientLanguagePage"'));
 assert.ok(html.includes('data-new-client-language="ru"'));
 assert.ok(html.includes('data-new-client-language="en"'));
 assert.ok(app.includes("page.hidden=true;page.setAttribute('aria-hidden','true');openRegistrationDestination();"));
 assert.ok(app.includes('showNewClientLanguageChoice();'));
 assert.ok(app.includes('applyRegistrationLanguage(code)'));
 assert.ok(app.includes('localStorage.setItem(profileLanguageKey(),code)'));
});
test('existing registered users continue without language onboarding',()=>{
 const app=fs.readFileSync(require.resolve('../app.js'),'utf8');
 assert.ok(app.includes('if(ready)openRegistrationDestination()'));
});

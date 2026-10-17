'use strict';const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('home uses bell icon rather than clover placeholder',()=>{const h=fs.readFileSync(require.resolve('../index.html'),'utf8');assert.ok(h.includes('id="homeNotificationBell"'));assert.ok(!h.includes('♧<i></i>'));assert.ok(h.includes('aria-label="Уведомления"'));});

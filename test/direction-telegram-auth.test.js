'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {verifyTelegram}=require('../api/_direction-telegram-auth');
const token='test-telegram-token';
function signed(id,ageSeconds=0){
 const p=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)-ageSeconds),user:JSON.stringify({id})});
 const data=[...p.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+'='+v).join('\n');
 const secret=crypto.createHmac('sha256','WebAppData').update(token).digest();
 p.set('hash',crypto.createHmac('sha256',secret).update(data).digest('hex'));
 return p.toString();
}
test('valid signed Telegram identity is accepted',()=>assert.equal(verifyTelegram(signed(12345),token),'12345'));
test('forged Telegram identity is rejected',()=>assert.equal(verifyTelegram(signed(12345).replace('12345','54321'),token),null));
test('expired Telegram authorization is rejected',()=>assert.equal(verifyTelegram(signed(12345,86401),token),null));
test('missing token is rejected',()=>assert.equal(verifyTelegram(signed(12345),''),null));

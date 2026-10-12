'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const handler=require('../api/direction-phase-tick');
async function run(auth,secret){
 const old=process.env.GALAXY_SCHEDULER_SECRET;
 process.env.GALAXY_SCHEDULER_SECRET=secret;
 let status,body;
 const res={setHeader(){},status(n){status=n;return this},json(b){body=b;return this}};
 try{await handler({method:'POST',headers:{authorization:auth}},res);return {status,body};}
 finally{if(old===undefined)delete process.env.GALAXY_SCHEDULER_SECRET;else process.env.GALAXY_SCHEDULER_SECRET=old;}
}
test('reject missing scheduler secret',async()=>assert.equal((await run('Bearer foo','')).status,503));
test('reject weak scheduler secret',async()=>assert.equal((await run('Bearer short','short')).status,503));
test('reject invalid scheduler bearer token',async()=>assert.equal((await run('Bearer wrong','x'.repeat(40))).status,401));

'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const worker=fs.readFileSync(path.join(__dirname,'../scripts/direction-scheduler-worker.js'),'utf8');
test('worker authenticates read-only preflight before scheduling mutating ticks',()=>{
 const preflight=worker.indexOf('await tick(true)');
 const loop=worker.indexOf('while(!stopped)');
 assert.ok(preflight>0&&loop>preflight);
 assert.ok(worker.includes('JSON.stringify(dryRun?{dryRun:true}:{})'));
 assert.ok(worker.includes("data?.dryRun!==true"));
 assert.ok(worker.includes("['dubai','transfer'].every"));
});

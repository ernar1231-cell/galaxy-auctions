'use strict';
// Dedicated long-running worker. Run as a single supervised instance outside Vercel serverless.
// No sessions are armed and no bidding feature flags are changed by this worker.
const endpoint=process.env.GALAXY_SCHEDULER_ENDPOINT;
const secret=process.env.GALAXY_SCHEDULER_SECRET;
const intervalMs=Number(process.env.GALAXY_SCHEDULER_INTERVAL_MS||1000);
if(!endpoint||!/^https:\/\//.test(endpoint)||!secret||secret.length<32){
 console.error('HTTPS scheduler endpoint and a >=32 character secret are required');
 process.exit(1);
}
if(!Number.isSafeInteger(intervalMs)||intervalMs<500||intervalMs>5000){
 console.error('Scheduler interval must be 500..5000 milliseconds');
 process.exit(1);
}
const controller=new AbortController();
let stopped=false;
process.once('SIGINT',()=>{stopped=true;controller.abort();});
process.once('SIGTERM',()=>{stopped=true;controller.abort();});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function tick(){
 const timeout=AbortSignal.timeout(8000);
 const signal=AbortSignal.any([controller.signal,timeout]);
 const response=await fetch(endpoint,{
  method:'POST',
  headers:{authorization:'Bearer '+secret,'Content-Type':'application/json'},
  body:'{}',
  cache:'no-store',
  signal
 });
 if(!response.ok)throw Error('Scheduler tick HTTP '+response.status);
}
(async()=>{
 console.log('Direction auction scheduler worker started');
 while(!stopped){
  const started=Date.now();
  try{await tick();}catch(error){if(!stopped)console.error('Scheduler tick failed:',error.message);}
  if(!stopped)await sleep(Math.max(0,intervalMs-(Date.now()-started)));
 }
})().catch(error=>{console.error(error);process.exitCode=1;});

'use strict';
// Vercel Cron uses GET and CRON_SECRET. The regular POST endpoint remains protected.
const handler=require('./direction-phase-tick');
module.exports=async(req,res)=>{
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 const secret=process.env.CRON_SECRET;
 if(!secret||secret.length<32||req.headers?.authorization!=='Bearer '+secret)
  return res.status(401).json({error:'Unauthorized cron'});
 if(!process.env.GALAXY_SCHEDULER_SECRET||process.env.GALAXY_SCHEDULER_SECRET.length<32)
  return res.status(503).json({error:'Scheduler secret not configured'});
 return handler({...req,method:'POST',headers:{...req.headers,authorization:'Bearer '+process.env.GALAXY_SCHEDULER_SECRET}},res);
};

'use strict';
const schedule=require('./_unified-live-schedule');
module.exports=(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 return res.status(200).json({mode:'simulation-preview',biddingEnabled:false,automatedSwitchingEnabled:false,timeZone:'Asia/Dubai',...schedule.resolve(new Date())});
};

'use strict';
const {weekKey,summarize,emailBody}=require('./analytics');
function nyTime(now){const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'short',hour:'2-digit',hourCycle:'h23'}).formatToParts(now);return Object.fromEntries(parts.map(p=>[p.type,p.value]));}
async function sendWeeklyReport({store,config,now=new Date(),fetchImpl=fetch}){
 if(!store||!config.emailKey||!config.emailFrom||!config.adminEmail)return {status:'not_configured'};
 const time=nyTime(now);if(time.weekday!=='Fri'||Number(time.hour)<8)return {status:'not_due'};
 const lastWeek=new Date(now.getTime()-7*86400000),week=weekKey(lastWeek),id='weekly-report:'+week;
 if(store.get('report',id))return {status:'already_sent'};
 const report=summarize(store,week);
 const response=await fetchImpl('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(15000),headers:{Authorization:'Bearer '+config.emailKey,'Content-Type':'application/json','Idempotency-Key':id},body:JSON.stringify({from:config.emailFrom,to:[config.adminEmail],subject:'CareerLaunch AI — Friday visitor and sales report',text:emailBody(report,config.baseUrl)})});
 if(!response.ok)throw Error('Weekly report email delivery was not accepted');
 store.put('report',id,'analytics','sent',{week,at:Date.now(),...report});
 return {status:'sent',week};
}
module.exports={sendWeeklyReport};

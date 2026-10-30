'use strict';
// Watch the sister sites from this server and email the owner if one stops responding.
// Two failed checks in a row before an alert; at most one alert per site every 6 hours, plus a "back up" note.
const SITES={'vetassistance.org':'https://www.vetassistance.org/','createdocuments.org':'https://createdocuments.org/health'};
const ALERT_GAP=6*3600000;
async function check(url){try{const c=new AbortController();const t=setTimeout(()=>c.abort(),20000);const r=await fetch(url,{signal:c.signal,headers:{'User-Agent':'CareerLaunch-uptime/1.0'}});clearTimeout(t);return r.status>=200&&r.status<400;}catch{return false;}}
function watcher(send,{checker=check,now=()=>Date.now()}={}){
 const fails={},alerted={},down={};for(const k of Object.keys(SITES)){fails[k]=0;alerted[k]=0;down[k]=false;}
 return async function runOnce(){for(const [name,url] of Object.entries(SITES)){
  if(await checker(url)){if(down[name])send(name+' is back up',name+' is responding again as of '+new Date(now()).toISOString().slice(0,16).replace('T',' ')+' UTC.');fails[name]=0;down[name]=false;continue;}
  fails[name]++;if(fails[name]>=2&&now()-alerted[name]>=ALERT_GAP){alerted[name]=now();down[name]=true;send(name+' looks down',url+' did not respond on two checks in a row (checked from resumebuilder.shop every 15 minutes).\n\nOpen Railway and look at that site\'s latest deployment and logs.');}
 }};
}
module.exports={SITES,check,watcher};

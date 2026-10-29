'use strict';
const EVENTS=new Set(['sign_in','account_created','draft_saved','checkout_started','checkout_failed','payment_verified','payment_failed','subscription_canceled','refund_review','document_delivered','download','generation_completed','generation_failed','builder_opened']);
function hit(store,event,{count=1,tokens=0,now=Date.now()}={}){
 if(!store||!EVENTS.has(event))return;
 const day=new Date(now).toISOString().slice(0,10),id=day+':'+event,previous=store.get('metric',id)?.data||{};
 store.put('metric',id,'operations','counted',{day,event,count:(previous.count||0)+count,tokens:(previous.tokens||0)+tokens});
}
function summary(store){const cutoff=new Date(Date.now()-30*86400000).toISOString().slice(0,10),totals={};for(const r of store.list('metric'))if(r.data.day>=cutoff){const d=r.data;totals[d.event]||={count:0,tokens:0};totals[d.event].count+=d.count||0;totals[d.event].tokens+=d.tokens||0;}return {periodDays:30,totals,costEstimate:null,costNote:'Token counts are provider-reported. Dollar cost is unavailable until verified model rates and billing are reconciled.'};}
module.exports={hit,summary,EVENTS};

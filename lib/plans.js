'use strict';
const PLANS=Object.freeze({
 access7:Object.freeze({id:'access7',label:'7-Day Access',amountCents:499,currency:'usd',billing:'one_time',durationDays:7,ai:false}),
 monthly:Object.freeze({id:'monthly',label:'Monthly Pro',amountCents:1299,currency:'usd',billing:'subscription',interval:'month',ai:true}),
 annual:Object.freeze({id:'annual',label:'Annual Pro',amountCents:5999,currency:'usd',billing:'subscription',interval:'year',ai:true}),
 premium:Object.freeze({id:'premium',label:'Premium Application Package',amountCents:9900,currency:'usd',billing:'one_time',ai:true})
});
function plan(id){if(!Object.hasOwn(PLANS,id))throw Error('Unknown plan');return PLANS[id]}
function entitlement({planId,status,expiresAt,canceledAt},now=Date.now()){
 const p=plan(planId);if(!['active','paid'].includes(status))return {active:false,canDownload:false,ai:false};
 if(!Number.isFinite(expiresAt)||expiresAt<=now)return {active:false,canDownload:false,ai:false};
 return {active:true,canDownload:true,ai:p.ai,renews:p.billing==='subscription'&&!canceledAt};
}
module.exports={PLANS,plan,entitlement};

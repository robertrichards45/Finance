'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const StripeClient=require('stripe');const {Billing}=require('../../lib/billing');const {Store}=require('../../lib/store');const {PLANS}=require('../../lib/plans');
function setup(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cl-billing-')),store=new Store({directory:dir,key:'a'.repeat(64)});let now=1800000000000,serial=0;const sessions={},subs={},invoices={},calls=[],notifications=[];
 const config={billingConfigured:true,checkoutEnabled:true,stripeLive:false,stripeAccountId:'acct_fixture',stripeWebhookSecret:'whsec_fixture',stripePortalConfigurationId:'bpc_fixture',stripePrices:{access7:'price_week',monthly:'price_month',annual:'price_year'},baseUrl:'https://example.test',aiDraftsPerMonth:2};
 const priceFor=price=>{const key=Object.keys(config.stripePrices).find(k=>config.stripePrices[k]===price),p=PLANS[key];return {id:price,active:true,livemode:false,unit_amount:p.amountCents,currency:'usd',tax_behavior:'exclusive',recurring:p.interval?{interval:p.interval,interval_count:1}:null};};
 const sdk={accounts:{retrieve:async()=>({id:'acct_fixture',charges_enabled:true})},prices:{retrieve:async p=>priceFor(p)},customers:{create:async()=>({id:'cus_fixture',livemode:false})},
  checkout:{sessions:{create:async(data,options)=>{calls.push({data,options});const p=priceFor(data.line_items[0].price);const s={id:'cs_test_'+(++serial),url:'https://checkout.stripe.com/c/pay/cs_test_'+serial,livemode:false,status:'open',payment_status:'unpaid',customer:data.customer,client_reference_id:data.client_reference_id,mode:data.mode,amount_subtotal:p.unit_amount,amount_total:p.unit_amount-(data.discounts?Math.round(p.unit_amount*0.2):0),currency:'usd',total_details:{amount_tax:0,amount_discount:data.discounts?Math.round(p.unit_amount*0.2):0,amount_shipping:0},line_items:{data:[{quantity:1,price:p}]},expires_at:now/1000+1800,payment_intent:'pi_fixture',created:now/1000};sessions[s.id]=s;return s;},retrieve:async sid=>sessions[sid]}},
  coupons:{retrieve:async cid=>cid==='vet20'?{id:'vet20',valid:true,livemode:false,percent_off:20,amount_off:null,duration:'once',applies_to:null}:(()=>{throw Error('No such coupon')})()},
  subscriptions:{retrieve:async sid=>subs[sid],update:async(sid,data)=>{Object.assign(subs[sid],data);return subs[sid];}},
  invoices:{retrieve:async iid=>invoices[iid],listLineItems:async iid=>({has_more:false,data:invoices[iid].lines})},
  invoicePayments:{list:async()=>({has_more:false,data:Object.values(invoices).slice(0,1).map(i=>({invoice:i.id}))})},
  charges:{retrieve:async()=>({id:'ch_fixture',livemode:false,customer:'cus_fixture',payment_intent:'pi_fixture',amount_refunded:1299})},
  billingPortal:{sessions:{create:async data=>({url:'https://billing.stripe.com/p/session/fixture',...data})}},webhooks:new StripeClient('fixture-only').webhooks};
 const billing=new Billing(store,config,{stripe:sdk,now:()=>now,notify:x=>notifications.push(x)}),user={owner:'owner-a',data:{email:'fictional@example.test'}};
 const event=(type,object,eventId='evt_'+type)=>({id:eventId,type,livemode:false,data:{object},created:Math.floor(Date.now()/1000)});
 async function paid(planId='access7',{settle=true}={}){
  await billing.checkout(user,planId);const s=Object.values(sessions).at(-1);s.status='complete';s.payment_status='paid';
  if(PLANS[planId].billing==='subscription'){s.subscription='sub_fixture';const p=PLANS[planId];subs.sub_fixture={id:'sub_fixture',livemode:false,customer:s.customer,status:'active',cancel_at_period_end:false,latest_invoice:'in_fixture',items:{data:[{quantity:1,price:priceFor(config.stripePrices[planId])}]}};
   invoices.in_fixture={id:'in_fixture',livemode:false,parent:{subscription_details:{subscription:'sub_fixture'}},customer:s.customer,status:'paid',amount_paid:p.amountCents+100,total:p.amountCents+100,subtotal:p.amountCents,currency:'usd',total_discount_amounts:[],lines:[{amount:p.amountCents,quantity:1,pricing:{price_details:{price:config.stripePrices[planId]}},period:{end:now/1000+(p.interval==='year'?365:30)*86400}}]};}
  if(settle)await billing.event(event('checkout.session.completed',s));return s;
 }
 return {store,config,billing,sdk,user,event,paid,sessions,subs,invoices,calls,notifications,setTime:v=>now=v,getTime:()=>now,close(){store.close();fs.rmSync(dir,{recursive:true,force:true});}};
}

module.exports={setup};

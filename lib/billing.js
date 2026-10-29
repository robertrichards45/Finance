'use strict';
const StripeClient=require('stripe');
const {random,fail}=require('./security');
const {PLANS}=require('./plans');
const PLAN_IDS=['access7','monthly','annual'];
const EVENTS=['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed','checkout.session.expired','customer.subscription.created','customer.subscription.updated','customer.subscription.deleted','invoice.paid','invoice.payment_failed','invoice.finalization_failed','charge.refunded','charge.dispute.created','charge.dispute.closed','radar.early_fraud_warning.created'];
const id=x=>typeof x==='string'?x:x?.id;
class Billing{
 constructor(store,config,{stripe,now=()=>Date.now(),notify=()=>{}}={}){
  const scope=config.stripeLive?'live':'sandbox';this.database=store;this.store={get:(k,i)=>store.get(k+':'+scope,i),put:(k,i,o,status,data)=>store.put(k+':'+scope,i,o,status,{...data,liveMode:config.stripeLive}),list:(k,o)=>store.list(k+':'+scope,o),delete:(k,i)=>store.delete(k+':'+scope,i),transaction:fn=>store.transaction(fn),quota:(k,n,w)=>store.quota(scope+':'+k,n,w)};this.config=config;this.now=now;this.notify=notify;this.locks=new Set();this.eventChain=Promise.resolve();
  this.stripe=stripe||(config.stripeSecretKey?new StripeClient(config.stripeSecretKey,{timeout:15000,maxNetworkRetries:2}):null);
 }
 mode(object){if(object?.livemode!==this.config.stripeLive)throw Error('Stripe environment mismatch');}
 pricePlan(priceId){return PLAN_IDS.find(k=>this.config.stripePrices?.[k]===priceId);}
 async checkCatalog(){
  if(!this.stripe||!this.config.billingConfigured)fail(503,'Billing is not configured.');
  if(this.catalogChecked)return;
  const account=await this.stripe.accounts.retrieve();if(account.id!==this.config.stripeAccountId)fail(503,'Billing account configuration needs correction.');if(this.config.stripeLive&&account.charges_enabled!==true)fail(503,'Stripe payments are not enabled for this account.');
  for(const key of PLAN_IDS){const p=await this.stripe.prices.retrieve(this.config.stripePrices[key]);this.mode(p);const expected=PLANS[key];
   if(!p.active||p.unit_amount!==expected.amountCents||p.currency!=='usd'||(expected.billing==='subscription'?(p.recurring?.interval!==expected.interval||p.recurring?.interval_count!==1):Boolean(p.recurring)))throw Error('Stripe price does not match the advertised plan');}
  this.catalogChecked=true;
 }
 access(owner){
  const hold=this.store.list('billing_hold',owner).some(r=>r.status==='open');const grants=this.store.list('billing_grant',owner).filter(r=>r.status==='active'&&r.data.expiresAt>this.now());
  const best=grants.sort((a,b)=>Number(PLANS[b.data.planId]?.ai)-Number(PLANS[a.data.planId]?.ai)||b.data.expiresAt-a.data.expiresAt)[0];
  return {active:Boolean(best)&&!hold,ai:Boolean(best&&PLANS[best.data.planId]?.ai)&&!hold,planId:best?.data.planId||null,expiresAt:best?.data.expiresAt||null,renews:Boolean(best?.data.subscriptionId&&!best.data.cancelAtPeriodEnd),onHold:hold};
 }
 require(owner,action='access'){const a=this.access(owner);if(!a.active)fail(402,a.onHold?'Billing needs attention. Contact support.':'Choose a paid access plan to continue.');if(action==='ai'&&!a.ai)fail(402,'AI drafting requires a Pro plan. You can still write and edit your documents manually.');return a;}
 reserveGeneration(owner){this.require(owner,'ai');const month=new Date(this.now()).toISOString().slice(0,7);if(!this.store.quota('billing-ai:'+owner+':'+month,this.config.aiDraftsPerMonth||10,32*86400000))fail(429,'Your monthly AI drafting allowance is used. Manual editing remains available.');}
 async customer(owner,email){
  const existing=this.store.get('billing_customer',owner);if(existing)return existing.data.customerId;
  const c=await this.stripe.customers.create({email},{idempotencyKey:'careerlaunch-customer-'+owner});this.mode(c);
  this.store.transaction(()=>{this.store.put('billing_customer',owner,owner,'active',{customerId:c.id});this.store.put('stripe_customer',c.id,owner,'active',{});});return c.id;
 }
 async checkout(session,planId){
  if(!PLAN_IDS.includes(planId))fail(400,'Choose an available access plan.');if(!this.config.checkoutEnabled&&!(this.config.sandboxCheckoutEnabled&&session.admin))fail(503,'Checkout is not open.');
  const owner=session.owner;if(this.locks.has(owner))fail(409,'A billing request is already in progress.');this.locks.add(owner);
  try{
   await this.checkCatalog();await this.refresh(owner);
   if(this.access(owner).onHold)fail(409,'Contact support before making another purchase.');
   if(this.store.list('billing_subscription',owner).some(r=>!['canceled','incomplete_expired'].includes(r.status)))fail(409,'Manage your existing subscription before starting another plan.');
   if(this.access(owner).active)fail(409,'Your access is still active. Manage it in billing.');
   const customer=await this.customer(owner,session.data.email);let attempt=this.store.get('billing_attempt',owner);
   if(attempt?.data.sessionId){const remote=await this.stripe.checkout.sessions.retrieve(attempt.data.sessionId);this.mode(remote);
    if(remote.status==='open'&&remote.expires_at*1000>this.now()){if(attempt.data.planId!==planId)fail(409,'Finish or wait for the current checkout to expire before selecting a different plan.');return {url:this.safeURL(remote.url,'checkout.stripe.com'),testMode:!this.config.stripeLive};}
    if(remote.status==='complete'){await this.settleCheckout(remote.id);if(this.access(owner).active)fail(409,'Payment is already verified. Refresh your access.');if(this.store.get('billing_checkout',remote.id)?.status!=='paid')fail(409,'Your payment is processing. Do not pay again.');}
    this.store.put('billing_attempt',owner,owner,'closed',{...attempt.data,closed:true});attempt=null;
   }
   if(attempt&&!attempt.data.closed&&attempt.data.planId!==planId)fail(409,'Retry the same plan while its payment request is being confirmed.');
   const key=attempt&&!attempt.data.closed?attempt.data.key:random(),p=PLANS[planId],price=this.config.stripePrices[planId];
   this.store.put('billing_attempt',owner,owner,'creating',{key,planId});
   const result=await this.stripe.checkout.sessions.create({mode:p.billing==='subscription'?'subscription':'payment',customer,client_reference_id:owner,line_items:[{price,quantity:1}],success_url:this.config.baseUrl+'/portal?checkout=return',cancel_url:this.config.baseUrl+'/portal?checkout=cancel',expires_at:Math.floor(this.now()/1000)+1800},{idempotencyKey:'careerlaunch-checkout-'+key});
   this.mode(result);const url=this.safeURL(result.url,'checkout.stripe.com');
   this.store.transaction(()=>{this.store.put('billing_checkout',result.id,owner,'pending',{planId,priceId:price,customerId:customer,key});this.store.put('billing_attempt',owner,owner,'open',{key,planId,sessionId:result.id});});return {url,testMode:!this.config.stripeLive};
  }finally{this.locks.delete(owner);}
 }
 safeURL(value,host){const u=new URL(value);if(u.protocol!=='https:'||u.hostname!==host||u.username||u.password)throw Error('Unexpected Stripe redirect');return u.href;}
 async portal(session){await this.checkCatalog();const c=this.store.get('billing_customer',session.owner);if(!c)fail(404,'No billing account yet.');const p=await this.stripe.billingPortal.sessions.create({customer:c.data.customerId,configuration:this.config.stripePortalConfigurationId,return_url:this.config.baseUrl+'/portal'});return {url:this.safeURL(p.url,'billing.stripe.com'),testMode:!this.config.stripeLive};}
 verify(payload,signature){if(!this.stripe||!this.config.billingConfigured)fail(503,'Billing webhook is not configured.');let event;try{event=this.stripe.webhooks.constructEvent(payload,signature,this.config.stripeWebhookSecret);}catch{fail(400,'Invalid Stripe signature.');}if(event.livemode!==this.config.stripeLive)fail(400,'Unexpected Stripe environment.');if(event.account&&event.account!==this.config.stripeAccountId)fail(400,'Unexpected Stripe account.');return event;}
 async event(event){const work=this.eventChain.then(()=>this.process(event));this.eventChain=work.catch(()=>{});return work;}
 async process(event){
  if(!EVENTS.includes(event.type))return;if(this.store.get('billing_event',event.id))return;await this.checkCatalog();const object=event.data.object;
  if(event.type.startsWith('checkout.session.')){await this.settleCheckout(object.id);if(event.type==='checkout.session.async_payment_failed'){const row=this.store.get('billing_checkout',object.id);if(row){this.store.put('billing_checkout',row.id,row.owner,'failed',row.data);const attempt=this.store.get('billing_attempt',row.owner);if(attempt?.data.sessionId===row.id)this.store.put('billing_attempt',row.owner,row.owner,'closed',{key:attempt.data.key,planId:attempt.data.planId,closed:true});}}}
  else if(event.type.startsWith('customer.subscription.'))await this.syncSubscription(object.id);
  else if(event.type.startsWith('invoice.')){const invoice=await this.stripe.invoices.retrieve(object.id);this.mode(invoice);const sub=id(invoice.parent?.subscription_details?.subscription);if(sub)await this.syncSubscription(sub,invoice);}
  else await this.risk(event.type,object);
  this.store.put('billing_event',event.id,'stripe','processed',{type:event.type,processedAt:this.now()});
 }
 async settleCheckout(sessionId){
  const row=this.store.get('billing_checkout',sessionId);if(!row)return;const s=await this.stripe.checkout.sessions.retrieve(sessionId,{expand:['line_items']});this.mode(s);const p=PLANS[row.data.planId],line=s.line_items?.data;
  if(id(s.customer)!==row.data.customerId||s.client_reference_id!==row.owner||s.mode!==(p.billing==='subscription'?'subscription':'payment')||s.currency!=='usd'||line?.length!==1||line[0].quantity!==1||id(line[0].price)!==row.data.priceId)throw Error('Checkout ownership or price mismatch');
  const tax=s.total_details?.amount_tax||0,inclusive=line[0].price?.tax_behavior==='inclusive';if(!Number.isSafeInteger(tax)||tax<0||s.total_details?.amount_discount||s.total_details?.amount_shipping||s.amount_subtotal!==p.amountCents-(inclusive?tax:0)||s.amount_total!==p.amountCents+(inclusive?0:tax))throw Error('Checkout total mismatch');
  if(s.status!=='complete'||s.payment_status!=='paid'){this.store.put('billing_checkout',row.id,row.owner,s.status==='expired'?'expired':'pending',row.data);return;}
  if(p.billing==='subscription'){if(!id(s.subscription))throw Error('Missing subscription');await this.syncSubscription(id(s.subscription),undefined,row.owner);if(!this.store.get('billing_grant',id(s.subscription))?.data.expiresAt)return;}
  else if(!this.store.get('billing_grant',s.id)){
   const start=this.now(); // Never extend access when the same event is replayed.
   this.store.put('billing_grant',s.id,row.owner,'active',{planId:p.id,expiresAt:start+p.durationDays*86400000,paymentIntentId:id(s.payment_intent)});
  }
  if(p.billing==='one_time')this.recordPayment(s.id,row.owner,p.id,s.amount_total,s.total_details?.amount_tax||0);
  this.store.put('billing_checkout',s.id,row.owner,'paid',{...row.data,paymentIntentId:id(s.payment_intent),subscriptionId:id(s.subscription)});
 }
 async syncSubscription(subscriptionId,paidInvoice,expectedOwner){
  const s=await this.stripe.subscriptions.retrieve(subscriptionId);this.mode(s);const ownerRow=this.store.get('stripe_customer',id(s.customer));if(!ownerRow)return;if(expectedOwner&&ownerRow.owner!==expectedOwner)throw Error('Checkout subscription owner mismatch');
  const items=s.items?.data;if(items?.length!==1||items[0].quantity!==1)throw Error('Unexpected subscription items');const priceId=id(items[0].price),planId=this.pricePlan(priceId);if(!planId||PLANS[planId].billing!=='subscription')throw Error('Unrecognized subscription price');
  const p=PLANS[planId],prior=this.store.get('billing_subscription',s.id),owner=ownerRow.owner;if(prior&&prior.owner!==owner)throw Error('Subscription owner changed');
  let paidUntil=prior?.data.paidUntil||0;
  const invoice=paidInvoice||(id(s.latest_invoice)?await this.stripe.invoices.retrieve(id(s.latest_invoice)):null);
  if(invoice){this.mode(invoice);if(id(invoice.customer)!==id(s.customer)||id(invoice.parent?.subscription_details?.subscription)!==s.id)throw Error('Invoice ownership mismatch');
   if(invoice.status==='paid'&&invoice.amount_paid===invoice.total&&invoice.total>=p.amountCents&&invoice.subtotal===p.amountCents&&invoice.currency==='usd'&&!(invoice.total_discount_amounts||[]).some(d=>d.amount)){
    const lines=await this.stripe.invoices.listLineItems(invoice.id,{limit:10});if(lines.has_more||lines.data.length!==1)throw Error('Unexpected invoice lines');const line=lines.data[0];
    if(id(line.pricing?.price_details?.price)!==priceId||line.quantity!==1||line.amount!==p.amountCents||!Number.isFinite(line.period?.end))throw Error('Invoice price mismatch');
    paidUntil=Math.max(paidUntil,line.period.end*1000);this.recordPayment(invoice.id,owner,planId,invoice.amount_paid,(invoice.total_taxes||[]).reduce((n,t)=>n+t.amount,0));
   }
  }
  const active=s.status==='active'&&!s.pause_collection&&paidUntil>this.now();
  this.store.transaction(()=>{this.store.put('billing_subscription',s.id,owner,s.status,{planId,customerId:id(s.customer),paidUntil,cancelAtPeriodEnd:Boolean(s.cancel_at_period_end),syncedAt:this.now()});this.store.put('billing_grant',s.id,owner,active?'active':'inactive',{planId,subscriptionId:s.id,expiresAt:paidUntil,cancelAtPeriodEnd:Boolean(s.cancel_at_period_end)});});
 }
 recordPayment(paymentId,owner,planId,amountCents,taxCents){if(this.store.get('billing_payment',paymentId))return;const {weekKey}=require('./analytics');this.store.put('billing_payment',paymentId,owner,'verified',{planId,amountCents,taxCents,currency:'usd',analyticsWeek:weekKey(new Date(this.now()))});}
 async refresh(owner){
  for(const s of this.store.list('billing_subscription',owner))await this.syncSubscription(s.id);
  const attempt=this.store.get('billing_attempt',owner);if(attempt?.data.sessionId)await this.settleCheckout(attempt.data.sessionId);
 }
 async risk(type,object){
  const chargeId=type==='charge.refunded'?object.id:id(object.charge);if(!chargeId)throw Error('Risk event has no charge');const c=await this.stripe.charges.retrieve(chargeId);this.mode(c);const ownerRow=this.store.get('stripe_customer',id(c.customer));if(!ownerRow)return;
  const owner=ownerRow.owner;if(type==='charge.refunded'&&!c.amount_refunded)return;
  // Resolve subscriptions through Stripe's first-class payment -> invoice -> subscription graph.
  const subscriptionIds=[];
  if(id(c.payment_intent)){const payments=await this.stripe.invoicePayments.list({payment:{type:'payment_intent',payment_intent:id(c.payment_intent)},limit:100});if(payments.has_more)throw Error('Risk linkage needs manual review');
   for(const payment of payments.data){const invoice=await this.stripe.invoices.retrieve(id(payment.invoice));if(id(invoice.customer)!==id(c.customer))throw Error('Risk ownership mismatch');const sub=id(invoice.parent?.subscription_details?.subscription);if(sub&&!subscriptionIds.includes(sub))subscriptionIds.push(sub);}}
  for(const subId of subscriptionIds){const sub=await this.stripe.subscriptions.retrieve(subId);if(id(sub.customer)!==id(c.customer))throw Error('Risk subscription mismatch');if(type!=='charge.dispute.closed'&&!['canceled','incomplete_expired'].includes(sub.status))await this.stripe.subscriptions.update(subId,{cancel_at_period_end:true},{idempotencyKey:'careerlaunch-risk-'+chargeId+'-'+subId});await this.syncSubscription(subId);}
  const resolved=type==='charge.dispute.closed'&&object.status==='won';
  // A refunded payment/fraud warning still needs operator review even if a dispute is won.
  const holdId=type.startsWith('charge.dispute.')?'dispute-'+object.id:'charge-'+chargeId;
  this.store.put('billing_hold',holdId,owner,resolved?'resolved':'open',{chargeId,type,subscriptionIds,reason:resolved?'Dispute won; automatic renewal remains canceled.':'Payment needs operator review.'});
  this.notify({owner,caseId:holdId,type});
 }
 summary(owner,{sandbox=false}={}){return {access:this.access(owner),hasCustomer:Boolean(this.store.get('billing_customer',owner)),plans:PLAN_IDS.map(k=>PLANS[k]),testMode:!this.config.stripeLive,checkoutEnabled:Boolean(this.config.checkoutEnabled||sandbox&&this.config.sandboxCheckoutEnabled),aiDraftsPerMonth:this.config.aiDraftsPerMonth||10};}
}
module.exports={Billing,PLAN_IDS,EVENTS};

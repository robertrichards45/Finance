'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const StripeClient=require('stripe');
const {Billing,EVENTS}=require('../lib/billing');const {Store}=require('../lib/store');const {PLANS}=require('../lib/plans');
const {setup}=require('./fixtures/billing');
test('Standard Stripe Checkout uses exact server prices with no overridden tax or adaptive pricing',async()=>{const s=setup();try{await s.billing.checkout(s.user,'annual');const request=s.calls[0];assert.equal(Object.hasOwn(request.data,'managed_payments'),false);assert.equal(request.data.mode,'subscription');assert.equal(request.data.line_items[0].price,'price_year');assert.equal(request.data.customer,'cus_fixture');assert.equal(request.data.client_reference_id,s.user.owner);assert.equal(Object.hasOwn(request.data,'subscription_data'),false);assert.equal(Object.hasOwn(request.data,'payment_method_types'),false);for(const key of ['adaptive_pricing','automatic_tax','tax_id_collection','discounts'])assert.equal(Object.hasOwn(request.data,key),false,key);assert.ok(request.options.idempotencyKey);assert.equal(s.billing.access(s.user.owner).active,false);}finally{s.close();}});
test('one-time access starts only after verified paid state and expires without renewal',async()=>{const s=setup();try{const session=await s.paid();const expiry=s.billing.access(s.user.owner).expiresAt;assert.equal(expiry,s.getTime()+7*86400000);assert.equal(s.billing.access(s.user.owner).ai,true);for(let i=0;i<3;i++)s.billing.reserveGeneration(s.user.owner);assert.throws(()=>s.billing.reserveGeneration(s.user.owner),e=>e.status===429);await s.billing.event(s.event('checkout.session.async_payment_succeeded',session,'evt_other'));assert.equal(s.billing.access(s.user.owner).expiresAt,expiry);const reopened=new Billing(s.store,s.config,{stripe:s.sdk,now:()=>s.getTime()});assert.equal(reopened.access(s.user.owner).active,true);s.setTime(expiry);assert.equal(s.billing.access(s.user.owner).active,false);}finally{s.close();}});
test('wrong customer, price, mode and totals never grant access',async()=>{for(const mutate of [x=>x.customer='cus_other',x=>x.client_reference_id='owner-b',x=>x.line_items.data[0].price={id:'price_wrong'},x=>x.mode='subscription',x=>x.currency='eur',x=>x.amount_total=1]){const s=setup();try{await s.billing.checkout(s.user,'access7');const session=Object.values(s.sessions)[0];session.status='complete';session.payment_status='paid';mutate(session);await assert.rejects(s.billing.event(s.event('checkout.session.completed',session)));assert.equal(s.billing.access(s.user.owner).active,false);}finally{s.close();}}});
test('tax and local-currency presentment do not change the configured base plan price',async()=>{const s=setup();try{await s.billing.checkout(s.user,'access7');const x=Object.values(s.sessions)[0];x.status='complete';x.payment_status='paid';x.total_details.amount_tax=40;x.amount_total=539;x.presentment_details={presentment_currency:'eur',presentment_amount:501};await s.billing.event(s.event('checkout.session.completed',x));assert.equal(s.billing.access(s.user.owner).active,true);}finally{s.close();}});
test('subscription access needs a paid matching invoice; renewal, cancellation and stale events use current state',async()=>{const s=setup();try{await s.paid('monthly');let access=s.billing.access(s.user.owner);assert.equal(access.active,true);assert.equal(access.renews,true);assert.equal(access.ai,true);const sub=s.subs.sub_fixture;sub.cancel_at_period_end=true;await s.billing.event(s.event('customer.subscription.updated',{id:sub.id},'evt_cancel'));assert.equal(s.billing.access(s.user.owner).active,true);assert.equal(s.billing.access(s.user.owner).renews,false);const initialExpiry=access.expiresAt;s.invoices.in_fixture.lines[0].period.end+=30*86400;await s.billing.event(s.event('invoice.paid',{id:'in_fixture'},'evt_renew'));assert.equal(s.billing.access(s.user.owner).expiresAt,initialExpiry+30*86400000);sub.status='past_due';s.invoices.in_fixture.status='open';await s.billing.event(s.event('customer.subscription.updated',{id:sub.id,status:'active'},'evt_stale'));assert.equal(s.billing.access(s.user.owner).active,false);}finally{s.close();}});
test('wrong invoice line cannot unlock a subscription',async()=>{const s=setup();try{await s.paid('monthly');s.billing.store.delete('billing_grant','sub_fixture');s.invoices.in_fixture.lines[0].pricing.price_details.price='price_wrong';await assert.rejects(s.billing.syncSubscription('sub_fixture'));assert.equal(s.billing.access(s.user.owner).active,false);}finally{s.close();}});
test('duplicate checkout calls reuse an open session, while mismatched plans are rejected',async()=>{const s=setup();try{const one=await s.billing.checkout(s.user,'access7'),two=await s.billing.checkout(s.user,'access7');assert.equal(one.url,two.url);assert.equal(s.calls.length,1);await assert.rejects(s.billing.checkout(s.user,'monthly'),/current checkout/);}finally{s.close();}});
test('transient creation failure retries with the same idempotency key',async()=>{const s=setup();try{const real=s.sdk.checkout.sessions.create;let first=true,key;s.sdk.checkout.sessions.create=async(data,options)=>{if(first){first=false;key=options.idempotencyKey;throw Error('network uncertainty');}assert.equal(options.idempotencyKey,key);return real(data,options);};await assert.rejects(s.billing.checkout(s.user,'access7'));await s.billing.checkout(s.user,'access7');assert.equal(s.calls.length,1);}finally{s.close();}});
test('completed but unpaid asynchronous sessions cannot unlock access or charge again',async()=>{const s=setup();try{await s.billing.checkout(s.user,'access7');const x=Object.values(s.sessions)[0];x.status='complete';await s.billing.event(s.event('checkout.session.completed',x));assert.equal(s.billing.access(s.user.owner).active,false);await assert.rejects(s.billing.checkout(s.user,'access7'),/processing/);await s.billing.event(s.event('checkout.session.async_payment_failed',x,'evt_async_fail'));await s.billing.checkout(s.user,'access7');assert.equal(s.calls.length,2);}finally{s.close();}});
test('refunds suspend access, resolve through first-class resources and stop subscription renewal',async()=>{const s=setup();try{await s.paid('monthly');await s.billing.event(s.event('charge.refunded',{id:'ch_fixture'}));assert.equal(s.billing.access(s.user.owner).active,false);assert.equal(s.billing.access(s.user.owner).onHold,true);assert.equal(s.subs.sub_fixture.cancel_at_period_end,true);assert.deepEqual(s.billing.store.list('billing_hold',s.user.owner)[0].data.subscriptionIds,['sub_fixture']);assert.equal(s.notifications.filter(n=>n.type==='charge.refunded').length,1);await s.billing.event(s.event('charge.refunded',{id:'ch_fixture'}));assert.equal(s.notifications.filter(n=>n.type==='charge.refunded').length,1);assert.ok((await s.billing.portal(s.user)).url.startsWith('https://billing.stripe.com/'));}finally{s.close();}});
test('winning a dispute does not clear a separate refund hold or restart renewal',async()=>{const s=setup();try{await s.paid('monthly');await s.billing.event(s.event('charge.refunded',{id:'ch_fixture'}));await s.billing.event(s.event('charge.dispute.created',{id:'du_fixture',charge:'ch_fixture'}));await s.billing.event(s.event('charge.dispute.closed',{id:'du_fixture',charge:'ch_fixture',status:'won'}));assert.equal(s.billing.access(s.user.owner).onHold,true);assert.equal(s.subs.sub_fixture.cancel_at_period_end,true);}finally{s.close();}});
test('raw Stripe signatures, environment and account are checked before processing',()=>{const s=setup();try{const event=s.event('checkout.session.completed',{id:'cs_test_fixture'}),payload=JSON.stringify(event),header=s.sdk.webhooks.generateTestHeaderString({payload,secret:s.config.stripeWebhookSecret});assert.equal(s.billing.verify(Buffer.from(payload),header).id,event.id);assert.throws(()=>s.billing.verify(Buffer.from(payload+' '),header));assert.throws(()=>s.billing.verify(Buffer.from(payload),header.replace(/v1=/,'v0=')));const live=JSON.stringify({...event,livemode:true}),sig=s.sdk.webhooks.generateTestHeaderString({payload:live,secret:s.config.stripeWebhookSecret});assert.throws(()=>s.billing.verify(Buffer.from(live),sig),/environment/);assert.ok(EVENTS.includes('invoice.payment_failed'));assert.ok(EVENTS.includes('charge.dispute.created'));}finally{s.close();}});
test('unrecognized catalog and wrong account fail closed',async()=>{const s=setup();try{s.sdk.accounts.retrieve=async()=>({id:'acct_wrong'});await assert.rejects(s.billing.checkout(s.user,'access7'),/account/);assert.equal(s.calls.length,0);}finally{s.close();}});
test('monthly AI allowance is persistent and manual access survives its exhaustion',async()=>{const s=setup();try{await s.paid('monthly');s.billing.reserveGeneration(s.user.owner);s.billing.reserveGeneration(s.user.owner);assert.throws(()=>s.billing.reserveGeneration(s.user.owner),/allowance/);assert.equal(s.billing.require(s.user.owner).active,true);}finally{s.close();}});

test('expired one-time access can be purchased again without extending the old grant',async()=>{const s=setup();try{const first=await s.paid();const old=s.billing.access(s.user.owner).expiresAt;s.setTime(old+1);await s.billing.checkout(s.user,'access7');assert.equal(s.calls.length,2);assert.equal(s.billing.store.get('billing_grant',first.id).data.expiresAt,old);}finally{s.close();}});
test('a checkout cannot grant a different customer subscription access',async()=>{const s=setup();try{await s.paid('monthly');s.billing.store.delete('billing_grant','sub_fixture');s.billing.store.put('stripe_customer','cus_other','owner-b','active',{});s.subs.sub_fixture.customer='cus_other';await assert.rejects(s.billing.settleCheckout(Object.keys(s.sessions)[0]),/owner mismatch/);assert.equal(s.billing.access('owner-b').active,false);}finally{s.close();}});

test('sandbox grants, customers and processed events cannot carry into live mode',async()=>{const s=setup();try{await s.paid();const live=new Billing(s.store,{...s.config,stripeLive:true},{stripe:s.sdk,now:()=>s.getTime()});assert.equal(s.billing.access(s.user.owner).active,true);assert.equal(live.access(s.user.owner).active,false);assert.equal(live.store.get('billing_customer',s.user.owner),null);assert.equal(live.store.list('billing_event').length,0);}finally{s.close();}});

test('checkout status belongs only to its customer and becomes paid after verified Stripe payment',async()=>{const s=setup();try{assert.equal(s.billing.summary(s.user.owner).lastCheckout,null);await s.billing.checkout(s.user,'monthly');assert.deepEqual(s.billing.summary(s.user.owner).lastCheckout,{status:'pending',planId:'monthly'});assert.equal(s.billing.summary('unrelated-owner').lastCheckout,null);await s.paid('monthly');assert.deepEqual(s.billing.summary(s.user.owner).lastCheckout,{status:'paid',planId:'monthly'});assert.equal(s.billing.summary(s.user.owner).access.active,true);}finally{s.close();}});

test('annual paid invoice grants a full-year term, renews once per verified invoice and ends after cancellation',async()=>{
 const s=setup();
 try{
  await s.paid('annual');
  const started=s.getTime(),first=s.billing.access(s.user.owner);
  assert.equal(first.active,true);
  assert.equal(first.planId,'annual');
  assert.equal(first.expiresAt,started+365*86400000);
  assert.equal(first.renews,true);
  const amount=s.billing.store.list('billing_payment',s.user.owner);
  assert.equal(amount.length,1);
  await s.billing.event(s.event('checkout.session.completed',Object.values(s.sessions)[0],'evt_replay'));
  assert.equal(s.billing.store.list('billing_payment',s.user.owner).length,1);
  const invoice=s.invoices.in_fixture;invoice.lines[0].period.end+=365*86400;
  await s.billing.event(s.event('invoice.paid',{id:invoice.id},'evt_annual_renewed'));
  const renewed=s.billing.access(s.user.owner);
  assert.equal(renewed.expiresAt,first.expiresAt+365*86400000);
  assert.equal(s.billing.store.list('billing_payment',s.user.owner).length,1,'the same invoice must not be double-counted');
  s.subs.sub_fixture.cancel_at_period_end=true;
  await s.billing.event(s.event('customer.subscription.updated',{id:'sub_fixture'},'evt_annual_cancel'));
  assert.equal(s.billing.access(s.user.owner).active,true);
  assert.equal(s.billing.access(s.user.owner).renews,false);
  s.setTime(renewed.expiresAt+1);
  s.subs.sub_fixture.status='canceled';
  await s.billing.event(s.event('customer.subscription.deleted',{id:'sub_fixture'},'evt_annual_deleted'));
  assert.equal(s.billing.access(s.user.owner).active,false);
  assert.throws(()=>s.billing.require(s.user.owner),/Choose a paid access plan/);
 }finally{s.close();}
});
test('a completed but unpaid Stripe checkout never grants a seven-day document entitlement',async()=>{
 const s=setup();
 try{
  await s.billing.checkout(s.user,'access7');
  const checkout=Object.values(s.sessions)[0];
  checkout.status='complete';checkout.payment_status='unpaid';
  await s.billing.event(s.event('checkout.session.completed',checkout,'evt_without_payment'));
  assert.equal(s.billing.access(s.user.owner).active,false);
  assert.equal(s.billing.store.list('billing_payment',s.user.owner).length,0);
  assert.equal(s.billing.summary(s.user.owner).lastCheckout.status,'pending');
  assert.throws(()=>s.billing.require(s.user.owner),/Choose a paid access plan/);
 }finally{s.close();}
});

test('purchase and cancellation notifications follow verified lifecycle events without duplicate receipts',async()=>{const s=setup();try{await s.billing.checkout(s.user,'monthly');assert.equal(s.notifications.filter(n=>n.type==='payment_verified').length,0);await s.paid('monthly');assert.equal(s.notifications.filter(n=>n.type==='payment_verified').length,1);await s.billing.refresh(s.user.owner);assert.equal(s.notifications.filter(n=>n.type==='payment_verified').length,1);s.subs.sub_fixture.cancel_at_period_end=true;await s.billing.syncSubscription('sub_fixture');await s.billing.syncSubscription('sub_fixture');assert.equal(s.notifications.filter(n=>n.type==='subscription_canceled').length,1);}finally{s.close();}});

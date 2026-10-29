'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {verifyStripeSignature,createTestCheckout,parsePaidCheckoutEvent}=require('../lib/stripe-checkout');
test('Stripe webhook signature validates timestamp and payload',()=>{
 const secret='whsec_example',payload=Buffer.from('{"id":"evt_test"}'),now=1800000000;
 const digest=crypto.createHmac('sha256',secret).update(now+'.').update(payload).digest('hex');
 assert.equal(verifyStripeSignature(payload,'t='+now+',v1='+digest,secret,now),true);
 assert.equal(verifyStripeSignature(Buffer.from('{}'),'t='+now+',v1='+digest,secret,now),false);
 assert.equal(verifyStripeSignature(payload,'t='+now+',v1='+digest,secret,now+301),false);
});
test('Checkout refuses live secret keys and invalid orders',async()=>{
 await assert.rejects(createTestCheckout({secretKey:'sk_live_unsafe',priceId:'price_123',orderId:'cl_'+'a'.repeat(32),baseUrl:'https://resumebuilder.shop',email:'test@example.com'}),/Test Stripe key/);
 await assert.rejects(createTestCheckout({secretKey:'sk_test_dummy',priceId:'price_123',orderId:'bad',baseUrl:'https://resumebuilder.shop',email:'test@example.com'}),/Invalid order/);
});
test('Checkout creates test session with a fixed Stripe price',async()=>{
 const result=await createTestCheckout({secretKey:'sk_test_dummy',priceId:'price_123',orderId:'cl_'+'a'.repeat(32),baseUrl:'https://resumebuilder.shop',email:'test@example.com',fetchImpl:async(url,options)=>{
 assert.equal(url,'https://api.stripe.com/v1/checkout/sessions');
 const form=new URLSearchParams(options.body);assert.equal(form.get('line_items[0][price]'),'price_123');assert.equal(form.get('client_reference_id'),'cl_'+'a'.repeat(32));assert.equal(form.get('mode'),'payment');
 return {ok:true,json:async()=>({livemode:false,id:'cs_test_123',url:'https://checkout.stripe.com/c/pay/cs_test_123'})};
 }});
 assert.equal(result.id,'cs_test_123');
});

test('signed paid test checkout can be recorded; unpaid and live events are rejected',()=>{
 const secret='whsec_example',now=Math.floor(Date.now()/1000),orderId='cl_'+'a'.repeat(32);
 const event={id:'evt_test_123',type:'checkout.session.completed',livemode:false,data:{object:{id:'cs_test_123',livemode:false,mode:'payment',payment_status:'paid',client_reference_id:orderId,metadata:{order_id:orderId},amount_total:9900,currency:'usd'}}};
 const signed=x=>{const payload=Buffer.from(JSON.stringify(x));const digest=crypto.createHmac('sha256',secret).update(now+'.').update(payload).digest('hex');return [payload,'t='+now+',v1='+digest]};
 const [payload,header]=signed(event);assert.equal(parsePaidCheckoutEvent(payload,header,secret).orderId,orderId);
 assert.throws(()=>parsePaidCheckoutEvent(payload,header+'bad',secret),/signature/);
 const unpaid=structuredClone(event);unpaid.data.object.payment_status='unpaid';const [p,h]=signed(unpaid);assert.equal(parsePaidCheckoutEvent(p,h,secret),null);
 const live=structuredClone(event);live.livemode=true;const [lp,lh]=signed(live);assert.throws(()=>parsePaidCheckoutEvent(lp,lh,secret),/unpaid/);
});

test('checkout rejects unexpected live response or external redirect',async()=>{
 const base={secretKey:'sk_test_dummy',priceId:'price_123',orderId:'cl_'+'a'.repeat(32),baseUrl:'https://resumebuilder.shop',email:'test@example.com'};
 await assert.rejects(createTestCheckout({...base,fetchImpl:async()=>({ok:true,json:async()=>({livemode:true,id:'cs_live_123',url:'https://checkout.stripe.com/c/pay/cs_live_123'})})}),/Invalid test checkout response/);
 await assert.rejects(createTestCheckout({...base,fetchImpl:async()=>({ok:true,json:async()=>({livemode:false,id:'cs_test_123',url:'https://evil.example/checkout'})})}),/Invalid test checkout response/);
});

test('checkout rejects a misleading Stripe-looking URL host',async()=>{const base={secretKey:'sk_test_dummy',priceId:'price_123',orderId:'cl_'+'a'.repeat(32),baseUrl:'https://resumebuilder.shop',email:'test@example.com'};await assert.rejects(createTestCheckout({...base,fetchImpl:async()=>({ok:true,json:async()=>({livemode:false,id:'cs_test_123',url:'https://checkout.stripe.com.evil.example/pay'})})}),/Invalid test checkout response/);});

test('restricted sandbox keys work and checkout creation has a stable idempotency key',async()=>{let key;const options={secretKey:'rk_test_dummy',priceId:'price_123',orderId:'cl_'+'c'.repeat(32),baseUrl:'https://resumebuilder.shop',email:'test@example.com',fetchImpl:async(url,opts)=>{const body=new URLSearchParams(opts.body);assert.equal(body.has('payment_method_types'),false);assert.equal(body.has('automatic_tax[enabled]'),false);assert.match(body.get('integration_identifier'),/_[a-z]{8}$/);assert.ok(body.get('success_url').includes('#order=cl_'));assert.equal(key===undefined||key===opts.headers['Idempotency-Key'],true);key=opts.headers['Idempotency-Key'];return {ok:true,json:async()=>({id:'cs_test_abc',livemode:false,url:'https://checkout.stripe.com/c/pay/cs_test_abc'})}}};await createTestCheckout(options);await createTestCheckout(options);assert.ok(key);});
test('delayed success is recognized only after a signed paid event',()=>{const secret='whsec_example',timestamp=Math.floor(Date.now()/1000),orderId='cl_'+'c'.repeat(32),event={id:'evt_delayed',livemode:false,type:'checkout.session.async_payment_succeeded',data:{object:{id:'cs_test_delayed',livemode:false,mode:'payment',payment_status:'paid',client_reference_id:orderId,metadata:{order_id:orderId},amount_total:9900,currency:'usd'}}};const payload=Buffer.from(JSON.stringify(event)),signature=crypto.createHmac('sha256',secret).update(timestamp+'.').update(payload).digest('hex');assert.equal(parsePaidCheckoutEvent(payload,'t='+timestamp+',v1='+signature,secret).sessionId,'cs_test_delayed');});

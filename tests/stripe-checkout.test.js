'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {verifyStripeSignature,createTestCheckout}=require('../lib/stripe-checkout');
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

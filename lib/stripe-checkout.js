'use strict';
const crypto=require('node:crypto');
const STRIPE_API='https://api.stripe.com/v1/checkout/sessions';
function verifyStripeSignature(payload,header,secret,now=Math.floor(Date.now()/1000)){
 if(!secret||typeof header!=='string')return false;
 const parts=header.split(',').map(s=>s.trim().split('='));
 const timestamp=parts.find(([k])=>k==='t')?.[1];
 const signatures=parts.filter(([k])=>k==='v1').map(([,v])=>v);
 if(!/^\d+$/.test(timestamp||'')||Math.abs(now-Number(timestamp))>300||!signatures.length)return false;
 const expected=crypto.createHmac('sha256',secret).update(timestamp+'.').update(payload).digest();
 return signatures.some(signature=>{if(!/^[a-f0-9]{64}$/i.test(signature))return false;return crypto.timingSafeEqual(expected,Buffer.from(signature,'hex'));});
}
async function createTestCheckout({secretKey,priceId,orderId,baseUrl,email,fetchImpl=fetch}){
 if(!secretKey?.startsWith('sk_test_'))throw Error('Test Stripe key required');
 if(!/^price_[A-Za-z0-9]+$/.test(priceId||''))throw Error('Stripe test price is not configured');
 if(!/^cl_[a-f0-9]{32}$/.test(orderId||''))throw Error('Invalid order');
 const base=new URL(baseUrl);
 if(base.protocol!=='https:'||base.username||base.password)throw Error('Invalid application URL');
 const form=new URLSearchParams({mode:'payment','line_items[0][price]':priceId,'line_items[0][quantity]':'1',client_reference_id:orderId,customer_email:email,'metadata[order_id]':orderId,success_url:base.origin+'/portal?checkout=return',cancel_url:base.origin+'/portal?checkout=cancel'});
 const response=await fetchImpl(STRIPE_API,{method:'POST',headers:{Authorization:'Bearer '+secretKey,'Content-Type':'application/x-www-form-urlencoded'},body:form,signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('Stripe Checkout session creation failed');
 const data=await response.json();
 if(data.livemode!==false||!/^cs_test_/.test(data.id||'')||!/^https:\/\/checkout\.stripe\.com\//.test(data.url||''))throw Error('Invalid test checkout response');
 return {id:data.id,url:data.url};
}
module.exports={verifyStripeSignature,createTestCheckout};

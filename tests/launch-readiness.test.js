'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {configuration}=require('../lib/config');
const valid={APP_BASE_URL:'https://resumebuilder.shop',DATA_DIR:'/data',DATA_ENCRYPTION_KEY:'a'.repeat(64),AUTH_SECRET:'b'.repeat(64),OPENAI_API_KEY:'test-ai',RESEND_API_KEY:'re_test',EMAIL_FROM:'CareerLaunch <hello@example.com>',ADMIN_EMAIL:'owner@example.com',STRIPE_SECRET_KEY:'sk_test_example',STRIPE_WEBHOOK_SECRET:'whsec_example',STRIPE_PRICE_ID:'price_123',LAUNCH_APPROVED:'true',INTAKE_ENABLED:'true'};
test('intake stays disabled until all launch requirements pass',()=>{const ready=configuration(valid);assert.equal(ready.ready,true);assert.equal(ready.enabled,true);for(const key of ['RESEND_API_KEY','EMAIL_FROM','STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','STRIPE_PRICE_ID','LAUNCH_APPROVED']){const broken={...valid};delete broken[key];const result=configuration(broken);assert.equal(result.enabled,false,key);assert.ok(result.blockers.length,key)}});
test('live Stripe credentials never enable the sandbox checkout',()=>{const result=configuration({...valid,STRIPE_SECRET_KEY:'sk_live_example'});assert.equal(result.enabled,false);assert.equal(result.stripeConfigured,false);assert.equal(result.stripeTestMode,false)});
test('intake requires explicit opt-in even with complete sandbox credentials',()=>{assert.equal(configuration({...valid,INTAKE_ENABLED:'false'}).enabled,false)});

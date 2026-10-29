'use strict';
const path=require('node:path');
function configuration(env=process.env){
 const production=env.NODE_ENV==='production'||Boolean(env.RAILWAY_ENVIRONMENT_ID);
 const baseUrl=(env.APP_BASE_URL||'https://resumebuilder.shop').replace(/\/$/,'');
 const dataDir=env.DATA_DIR||env.RAILWAY_VOLUME_MOUNT_PATH||'';
 const blockers=[];
 if(!/^https:\/\/[^/]+$/.test(baseUrl))blockers.push('HTTPS primary domain');
 if(!dataDir||!path.isAbsolute(dataDir))blockers.push('Persistent data directory');
 if(production&&(!env.RAILWAY_VOLUME_MOUNT_PATH||!dataDir.startsWith(env.RAILWAY_VOLUME_MOUNT_PATH+'/')&&dataDir!==env.RAILWAY_VOLUME_MOUNT_PATH))blockers.push('Railway persistent volume');
 if(!/^[a-fA-F0-9]{64}$/.test(env.DATA_ENCRYPTION_KEY||''))blockers.push('Data encryption key');
 if((env.AUTH_SECRET||'').length<48)blockers.push('Authentication secret');
 if(!env.OPENAI_API_KEY)blockers.push('AI provider');
 if(!env.RESEND_API_KEY||!env.EMAIL_FROM)blockers.push('Transactional email');
 if(!env.ADMIN_EMAIL)blockers.push('Administrator email');
 const stripeLive=env.STRIPE_MODE==='live';
 const stripePrices={access7:env.STRIPE_PRICE_ACCESS7||'',monthly:env.STRIPE_PRICE_MONTHLY||'',annual:env.STRIPE_PRICE_ANNUAL||''};
 const keyMode=stripeLive?/^[sr]k_live_/.test(env.STRIPE_SECRET_KEY||''):/^[sr]k_test_/.test(env.STRIPE_SECRET_KEY||'');
 const billingConfigured=keyMode&&/^acct_[A-Za-z0-9]+$/.test(env.STRIPE_ACCOUNT_ID||'')&&/^bpc_[A-Za-z0-9]+$/.test(env.STRIPE_PORTAL_CONFIGURATION_ID||'')&&env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_')&&Object.values(stripePrices).every(p=>/^price_[A-Za-z0-9]+$/.test(p))&&new Set(Object.values(stripePrices)).size===3;
 if(!billingConfigured)blockers.push('Verified plan billing configuration');
 if(stripeLive&&env.LIVE_PAYMENTS_APPROVED!=='true')blockers.push('Live payment acceptance approval');
 const sandboxEnabled=!stripeLive&&env.SANDBOX_TEST_ENABLED==='true'&&blockers.filter(b=>b!=='End-to-end launch approval').length===0;
 if(env.LAUNCH_APPROVED!=='true')blockers.push('End-to-end launch approval');
 return {production,baseUrl,dataDir,blockers,ready:blockers.length===0,enabled:env.INTAKE_ENABLED==='true'&&blockers.length===0,
 encryptionKey:env.DATA_ENCRYPTION_KEY,authSecret:env.AUTH_SECRET,apiKey:env.OPENAI_API_KEY,model:env.OPENAI_MODEL||'gpt-5.6-terra',
 sandboxEnabled,sandboxCheckoutEnabled:sandboxEnabled&&env.SANDBOX_CHECKOUT_ENABLED==='true',
 billingRequired:production||env.BILLING_REQUIRED==='true',billingConfigured:Boolean(billingConfigured),stripeConfigured:Boolean(billingConfigured),stripeLive,stripeTestMode:!stripeLive&&keyMode,stripePrices,
 stripeAccountId:env.STRIPE_ACCOUNT_ID||'',stripePortalConfigurationId:env.STRIPE_PORTAL_CONFIGURATION_ID||'',stripeSecretKey:env.STRIPE_SECRET_KEY||'',stripeWebhookSecret:env.STRIPE_WEBHOOK_SECRET||'',
 checkoutEnabled:env.PAYMENTS_ENABLED==='true'&&env.INTAKE_ENABLED==='true'&&blockers.length===0,
 aiDraftsPerMonth:Math.min(25,Math.max(1,Number(env.AI_DRAFTS_PER_MONTH)||10)),
 emailKey:env.RESEND_API_KEY,emailFrom:env.EMAIL_FROM,adminEmail:(env.ADMIN_EMAIL||'').toLowerCase(),
 priceCents:Math.max(0,Number(env.PACKAGE_PRICE_CENTS)||9900),maxJobsPerDay:Math.min(100,Math.max(1,Number(env.MAX_AI_JOBS_PER_DAY)||20)),
 retentionDays:Math.min(90,Math.max(1,Number(env.RETENTION_DAYS)||30)),clamavHost:env.CLAMAV_HOST,clamavPort:Number(env.CLAMAV_PORT)||3310};
}
module.exports={configuration};

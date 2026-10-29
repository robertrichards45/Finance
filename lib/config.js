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
 if(env.LAUNCH_APPROVED!=='true')blockers.push('End-to-end launch approval');
 return {production,baseUrl,dataDir,blockers,ready:blockers.length===0,enabled:env.INTAKE_ENABLED==='true'&&blockers.length===0,
 encryptionKey:env.DATA_ENCRYPTION_KEY,authSecret:env.AUTH_SECRET,apiKey:env.OPENAI_API_KEY,model:env.OPENAI_MODEL||'gpt-5.6-terra',
 emailKey:env.RESEND_API_KEY,emailFrom:env.EMAIL_FROM,adminEmail:(env.ADMIN_EMAIL||'').toLowerCase(),
 priceCents:Math.max(0,Number(env.PACKAGE_PRICE_CENTS)||9900),maxJobsPerDay:Math.min(100,Math.max(1,Number(env.MAX_AI_JOBS_PER_DAY)||20)),
 retentionDays:Math.min(90,Math.max(1,Number(env.RETENTION_DAYS)||30)),clamavHost:env.CLAMAV_HOST,clamavPort:Number(env.CLAMAV_PORT)||3310};
}
module.exports={configuration};

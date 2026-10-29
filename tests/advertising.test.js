'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {createApp}=require('../server');const ads=require('../lib/advertising');
const configured={ADSENSE_CLIENT:'ca-pub-1234567890123456',ADSENSE_SLOT:'1234567890',ADS_ENABLED:'true',ADS_CONSENT_READY:'true'};
async function withServer(settings,fn){const server=createApp({ads:settings});await new Promise(r=>server.listen(0,'127.0.0.1',r));try{await fn('http://127.0.0.1:'+server.address().port);}finally{await new Promise(r=>server.close(r));}}
test('advertising fails closed until publisher, placement and consent setup are complete',()=>{
 assert.equal(ads.settings({}).enabled,false);
 for(const key of Object.keys(configured)){const env={...configured};delete env[key];assert.equal(ads.settings(env).enabled,false,key);}
 assert.equal(ads.settings({...configured,ADSENSE_CLIENT:'<script>'}).client,'');
});
test('publisher verification works while ad delivery remains disabled',async()=>withServer(ads.settings({ADSENSE_CLIENT:configured.ADSENSE_CLIENT}),async base=>{
 const response=await fetch(base+'/');const html=await response.text();assert.match(html,/google-adsense-account/);assert.doesNotMatch(html,/src="\/advertising.js"/);assert.doesNotMatch(response.headers.get('content-security-policy'),/googlesyndication/);
 assert.equal(await(await fetch(base+'/ads.txt')).text(),'google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n');
}));
test('no invented ads.txt publisher entry when unconfigured',async()=>withServer(ads.settings({}),async base=>assert.equal((await fetch(base+'/ads.txt')).status,404)));
test('ad code and external ad permissions stay off private and query-bearing pages',async()=>withServer(ads.settings(configured),async base=>{
 for(const route of ['/start','/portal','/admin','/order.html','/contact','/privacy.html','/?token=private','/federal?email=private']){const response=await fetch(base+route);assert.equal(response.status,200,route);const html=await response.text();assert.doesNotMatch(html,/src="\/advertising.js"|google-adsense-account|class="adsbygoogle"/,route);assert.doesNotMatch(response.headers.get('content-security-policy'),/googlesyndication/,route);}
 const response=await fetch(base+'/federal-resume-guide');assert.match(await response.text(),/aria-label="Advertisement"/);assert.match(response.headers.get('content-security-policy'),/pagead2.googlesyndication.com/);
}));

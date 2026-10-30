'use strict';
const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const {configuration}=require('./lib/config');
const {Store}=require('./lib/store');
const {Service}=require('./lib/service');
const {same,cookie,fail,jsonBody}=require('./lib/security');
const {extractUpload}=require('./lib/uploads');
const {Billing}=require('./lib/billing');
const {answerQuestion}=require('./lib/site-assistant');
const analytics=require('./lib/analytics');
const telemetry=require('./lib/telemetry');
const advertising=require('./lib/advertising');
const backups=require('./lib/backups');
const crypto=require('node:crypto');
const {importJob}=require('./lib/job-import');
const {importResume}=require('./lib/resume-import');
const {sendWeeklyReport}=require('./lib/weekly-report');
const seo=require('./lib/seo');
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml','.xml':'application/xml; charset=utf-8','.mp4':'video/mp4','.jpg':'image/jpeg','.png':'image/png'};
const ROUTES={'/job-match-checker':'job-match-checker.html','/job-match.js':'job-match.js','/job-match.css':'job-match.css','/guides':'guides.html','/examples':'examples.html','/military-to-civilian-resume':'military-to-civilian-resume.html','/resume-employment-gaps':'resume-employment-gaps.html','/federal-police-resume':'federal-police-resume.html','/resume-readiness-checklist':'resume-readiness-checklist.html','/resume-readiness.js':'resume-readiness.js','/readiness.css':'readiness.css','/growth.css':'growth.css','/growth.js':'growth.js','/media/rough-duties.mp4':'media/rough-duties.mp4','/media/tailor-to-job.mp4':'media/tailor-to-job.mp4','/media/federal-two-pages.mp4':'media/federal-two-pages.mp4','/media/rough-duties.jpg':'media/rough-duties.jpg','/media/tailor-to-job.jpg':'media/tailor-to-job.jpg','/media/federal-two-pages.jpg':'media/federal-two-pages.jpg','/media/careerlaunch-share.png':'media/careerlaunch-share.png','/':'index.html','/index.html':'index.html','/start':'start.html','/portal':'portal.html','/admin':'admin.html','/services':'services.html','/cover-letter-guide':'cover-letter-guide.html','/resume-builder':'resume-builder.html','/federal-resume-guide':'federal-resume-guide.html','/federal':'federal.html','/private-sector':'private-sector.html','/contact':'contact.html','/policies':'policies.html','/privacy.html':'privacy.html','/terms.html':'terms.html','/templates':'templates.html','/templates.html':'templates.html','/templates.js':'templates.js','/site-assistant.js':'site-assistant.js','/advertising.js':'advertising.js','/guided-builder.js':'guided-builder.js','/builder-preview.js':'builder-preview.js','/order.html':'order.html','/order.js':'order.js','/app.js':'app.js','/styles.css':'styles.css','/robots.txt':'robots.txt','/sitemap.xml':'sitemap.xml','/mark.svg':'mark.svg'};
function consistentSiteLayout(html){
 const nav="<header class=\"site-header\"><a class=\"logo\" href=\"/\">CareerLaunch<span>AI</span><span class=\"logo-dot\" aria-hidden=\"true\"></span></a><nav aria-label=\"Main navigation\"><a href=\"/resume-builder\">Résumé builder</a><a href=\"/services\">Services</a><a href=\"/templates\">Résumé designs</a><a href=\"/#pricing\">Pricing</a><a href=\"/guides\">Guides & examples</a><a href=\"/portal\" class=\"nav-portal\">My applications <span aria-hidden=\"true\">↗</span></a></nav></header>";
 const chat="<aside class=\"career-chat\" aria-label=\"CareerLaunch AI help\"><button id=\"career-chat-toggle\" class=\"career-chat-toggle\" type=\"button\" aria-controls=\"career-chat-panel\" aria-expanded=\"false\">Ask CareerLaunch AI ✦</button><section id=\"career-chat-panel\" class=\"career-chat-panel\" hidden><h2>Ask about résumés or federal hiring</h2><p class=\"fine\">Pricing, templates, cover letters, USAJOBS, veterans’ preference, military spouse hiring, and more. Guidance is informational; verify current rules with OPM and the hiring agency.</p><div id=\"career-chat-history\" class=\"career-chat-history\" role=\"log\" aria-live=\"polite\"><p class=\"career-chat-message career-chat-assistant\">Hi! What would you like to know about résumés, federal applications, or CareerLaunch AI?</p></div><form id=\"career-chat-form\"><label for=\"career-chat-question\">Your question</label><textarea id=\"career-chat-question\" rows=\"2\" maxlength=\"800\" required minlength=\"3\" placeholder=\"Do I qualify for veterans’ preference?\"></textarea><button class=\"button small\" id=\"career-chat-submit\" type=\"submit\">Ask question</button></form><p class=\"fine\">Do not share SSNs or other sensitive personal information.</p></section></aside>";
 let result=html.replace(/<header class="site-header">[\s\S]*?<\/header>/i,nav);
 if(!result.includes('id="career-chat-toggle"'))result=result.replace(/<\/body>/i,chat+'</body>');
 if(!result.includes('src="/growth.js"'))result=result.replace(/<\/head>/i,'<script src="/growth.js" defer></script></head>');
 if(!result.includes('src="/site-assistant.js"'))result=result.replace(/<\/head>/i,'<script src="/site-assistant.js" defer></script></head>');
 return seo.decorate(result);
}
function allowedBrowserOrigin(req,config){
 const origin=req.headers.origin;
 if(typeof origin!=='string')return false;
 try{
  const parsed=new URL(origin);
  if(parsed.protocol!=='https:'&&!(parsed.protocol==='http:'&&['localhost','127.0.0.1'].includes(parsed.hostname)))return false;
  const permitted=new Set([config.baseUrl,'https://resumebuilder.shop','https://www.resumebuilder.shop','https://finance-production-8730.up.railway.app'].filter(Boolean).map(value=>new URL(value).origin));
  return permitted.has(parsed.origin);
 }catch{return false;}
}
function createApp({config=configuration(),store,service,billing:billingOverride,ads=advertising.settings(),imports={job:importJob,resume:importResume}}={}){
 let ownStore=false;
 if(!store&&config.dataDir&&/^[a-f0-9]{64}$/i.test(config.encryptionKey||'')){store=new Store({directory:config.dataDir,key:config.encryptionKey});ownStore=true;}
 service=service||(store?new Service(store,config):null);
 const billing=billingOverride||service?.billing||(store?new Billing(store,config,{notify:event=>{const {owner,caseId,type,paymentId,planId,subscriptionId,paidUntil}=event;if(['payment_verified','subscription_canceled','payment_failed'].includes(type)){const email=store.get('account',owner)?.data.email||store.list('session',owner)[0]?.data.email||store.list('order',owner)[0]?.data.email;if(!email)return;const subject=type==='payment_verified'?'Your CareerLaunch AI access is confirmed':type==='subscription_canceled'?'CareerLaunch AI renewal canceled':'CareerLaunch AI billing needs attention';const message=type==='payment_verified'?'Stripe confirmed payment for your '+planId+' access. Return to your saved applications and billing details: '+config.baseUrl+'/portal\nThis is an access confirmation. Your official payment receipt is provided by Stripe.':type==='subscription_canceled'?'Automatic renewal is canceled. Your current paid-through date is '+new Date(paidUntil).toISOString().slice(0,10)+'. Manage access in '+config.baseUrl+'/portal':'Stripe could not confirm a renewal payment. Review your billing details in '+config.baseUrl+'/portal';service?.enqueueMail(email,subject,message,'billing-notice-'+(paymentId||subscriptionId)+'-'+type);}else service?.enqueueMail(config.adminEmail,'CareerLaunch billing needs attention','Review the billing case in the administrator dashboard: '+caseId+' ('+type+').','billing-'+caseId+'-'+type);}}):null);if(service)service.billing=billing;
 const sandboxSession=session=>Boolean(config.sandboxEnabled&&session?.admin);
 const rate=new Map();let lastPrune=0;
 const server=http.createServer(async(req,res)=>{
  const requestId=crypto.randomUUID();
  const headers={'X-Request-ID':requestId,'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Permissions-Policy':'camera=(), microphone=(), geolocation=()','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'",'Cache-Control':'no-store','X-Robots-Tag':'noindex'};
  if(config.production)headers['Strict-Transport-Security']='max-age=31536000';
  function send(status,body,type='application/json; charset=utf-8',extra={}){if(res.writableEnded)return;res.writeHead(status,{...headers,'Content-Type':type,...extra});res.end(req.method==='HEAD'?undefined:(type.startsWith('application/json')?JSON.stringify(body):body));}
  try{
   const url=new URL(req.url,'http://localhost'),route=url.pathname;
   if(route==='/start'&&req.method==='GET'&&!/bot|crawl|spider/i.test(req.headers['user-agent']||''))telemetry.hit(store,'builder_opened');
   if(req.headers.host==='www.resumebuilder.shop'&&['GET','HEAD'].includes(req.method))return send(308,'','text/plain',{Location:config.baseUrl+url.pathname+url.search});
   if(['GET','HEAD'].includes(req.method)&&['/','/index.html','/services','/resume-builder','/cover-letter-guide','/federal-resume-guide','/federal','/private-sector','/contact','/policies','/privacy.html','/terms.html','/sitemap.xml','/robots.txt','/templates','/guides','/examples','/military-to-civilian-resume','/resume-employment-gaps','/federal-police-resume','/resume-readiness-checklist','/job-match-checker'].includes(route))delete headers['X-Robots-Tag'];
   if(route==='/api/stripe/webhook'&&req.method==='POST'){
    if(!billing||!config.billingConfigured)return send(503,{error:'Billing webhook is not configured'});
    const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>131072)fail(413,'Webhook too large');chunks.push(chunk);}
    const event=billing.verify(Buffer.concat(chunks),req.headers['stripe-signature']);await billing.event(event);return send(200,{received:true});
   }
   if(route==='/'+seo.INDEXNOW_KEY+'.txt'&&['GET','HEAD'].includes(req.method)){delete headers['X-Robots-Tag'];return send(200,seo.INDEXNOW_KEY,'text/plain; charset=utf-8');}
   if(route==='/BingSiteAuth.xml'&&['GET','HEAD'].includes(req.method)){const xml=seo.bingSiteAuth();delete headers['X-Robots-Tag'];return send(xml?200:404,xml||'Not configured','application/xml; charset=utf-8');}
   if(route==='/ads.txt'&&['GET','HEAD'].includes(req.method)){const text=advertising.adsTxt(ads);return send(text?200:404,text||'Advertising is not configured.','text/plain; charset=utf-8');}
   if(route==='/health')return send(200,{status:'ok',service:'careerlaunch-ai',checkoutEnabled:Boolean(config.checkoutEnabled),intakeEnabled:config.enabled,readinessBlockers:config.blockers,backupStatus:store?.get('operations','backup')?.status||'pending',backupCreatedAt:store?.get('operations','backup')?.data.createdAt||null});
   if(route==='/api/config'){const qa=sandboxSession(service?.session(cookie(req)));return send(200,{intakeEnabled:Boolean(config.enabled||qa),sandboxTestAccess:Boolean(config.adminPreviewEnabled),checkoutEnabled:Boolean(config.checkoutEnabled||qa&&config.sandboxCheckoutEnabled),billingTestMode:!config.stripeLive,aiDraftsPerMonth:config.aiDraftsPerMonth,documentUploads:Boolean(config.clamavHost),retentionDays:config.retentionDays});}
   if(route==='/api/site-assistant'&&req.method==='POST'){
    if(!allowedBrowserOrigin(req,config))fail(403,'Request origin is not allowed.');
    const now=Date.now(),ip=req.socket.remoteAddress||'unknown',key='assistant:'+ip;
    const previous=rate.get(key);const entry=previous&&previous.until>now?previous:{count:0,until:now+3600000};
    if(++entry.count>12)fail(429,'Assistant question limit reached. Please try again later.');
    rate.set(key,entry);
    const body=await jsonBody(req,2048);
    if(!body||typeof body.question!=='string'||body.question.trim().length<3||body.question.length>800)fail(400,'Ask a question between 3 and 800 characters.');
    if(store&&!store.quota('site-assistant:'+new Date().toISOString().slice(0,10),50,86400000))fail(429,'Assistant daily capacity reached.');
    const result=await answerQuestion(body.question,{apiKey:config.apiKey,model:config.model});
    return send(200,result);
   }
   if(route==='/api/marketing-event'&&req.method==='POST'){
    if(!allowedBrowserOrigin(req,config))fail(403,'Request origin is not allowed.');
    if(!store)return send(204,'','text/plain');
    const body=await jsonBody(req,100),event=body?.event;if(!['builder_cta','plan_selected'].includes(event))fail(400,'Unknown event.');
    if(req.headers['sec-gpc']==='1')return send(204,'','text/plain');
    const visitor=String(req.headers.cookie||'').match(/(?:^|;\s*)cl_visitor=([a-f0-9]{32})(?:;|$)/)?.[1];
    if(visitor&&store.quota('marketing-global:'+new Date().toISOString().slice(0,10),2000,86400000)&&store.quota('marketing:'+crypto.createHash('sha256').update(visitor).digest('hex')+':'+event,1,86400000))telemetry.hit(store,event);
    return send(204,'','text/plain');
   }
   if(route.startsWith('/api/')){
    if(!service||!store)fail(503,'Customer services are not open yet. Please use the sample preview.');
    const now=Date.now();if(now-lastPrune>60000){for(const [k,v]of rate)if(v.until<now)rate.delete(k);lastPrune=now;}
    const ip=req.socket.remoteAddress||'unknown',entry=rate.get(ip)||{count:0,until:now+60000};if(++entry.count>180)fail(429,'Too many requests. Try again shortly.');rate.set(ip,entry);
    const mutating=!['GET','HEAD'].includes(req.method);
    if(mutating&&!allowedBrowserOrigin(req,config))fail(403,'Request origin is not allowed.');
    if(req.method==='POST'&&route==='/api/auth/login'){if(!config.enabled&&!config.adminPreviewEnabled)fail(503,'Customer accounts are not open yet.');const b=await jsonBody(req,1024);if(config.enabled||typeof b.email==='string'&&b.email.trim().toLowerCase()===config.adminEmail)service.requestLogin(b.email,b.planId,b.continueBuilder===true);return send(202,{message:'Check your inbox for a private sign-in link. It expires in 15 minutes.'});}
    if(req.method==='POST'&&route==='/api/auth/verify'){if(!config.enabled&&!config.adminPreviewEnabled)fail(503,'Customer accounts are not open yet.');const b=await jsonBody(req,1024),auth=service.verifyLogin(b.token);if(!config.enabled&&!service.session(auth.session)?.admin){service.logout(auth.session);fail(503,'Private sandbox accounts only.');}return send(200,{ok:true},MIME['.json'],{'Set-Cookie':'cl_session='+auth.session+'; Path=/; HttpOnly; SameSite=Strict; Max-Age=43200'+(config.production?'; Secure':'')});}
    const session=service.session(cookie(req));if(!session)fail(401,'Sign in to continue.');
    if(mutating&&!same(req.headers['x-csrf-token'],session.data.csrf))fail(403,'Refresh the page and try again.');
    if(req.method==='GET'&&route==='/api/session')return send(200,{email:session.data.email,csrf:session.data.csrf,admin:session.admin});
    if(req.method==='POST'&&route==='/api/auth/logout'){service.logout(cookie(req));return send(200,{ok:true},MIME['.json'],{'Set-Cookie':'cl_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'+(config.production?'; Secure':'')});}
    if(req.method==='GET'&&route==='/api/admin')return send(200,service.admin(session));
    if(req.method==='GET'&&route==='/api/admin/analytics'){if(!session.admin)fail(403,'Administrator access required.');const current=analytics.weekKey();const previous=analytics.weekKey(new Date(Date.now()-7*86400000));return send(200,{current:analytics.summarize(store,current),acquisition:analytics.acquisitionSummary(store,current),previous:analytics.summarize(store,previous),reportEmailConfigured:Boolean(config.emailKey&&config.emailFrom&&config.adminEmail),livePaymentsConfigured:Boolean(config.billingConfigured&&config.stripeLive),definitions:'Visitors are cookie-based estimates, recognizable bots excluded; payments are verified live Stripe records; sandbox payments are separate. Gross receipts include tax and exclude refund/fee adjustments and net profit.'});}
    if(req.method==='POST'&&route==='/api/admin/support'){if(!session.admin)fail(403,'Administrator access required.');const b=await jsonBody(req,1024),r=store.get('support',b.id);if(!r)fail(404,'Request not found.');store.put('support',r.id,r.owner,'resolved',r.data);return send(200,{ok:true});}
    if(!config.enabled&&!sandboxSession(session)&&!(session.admin&&route==='/api/billing'&&req.method==='GET'))fail(503,'Customer processing is temporarily paused.');
    if(route==='/api/billing'&&req.method==='GET')return send(200,{...billing.summary(session.owner,{sandbox:sandboxSession(session)}),freeOrderId:service.freeOrder(session.owner)});
    if(route==='/api/billing/refresh'&&req.method==='POST'){await jsonBody(req,1024);await billing.checkCatalog();await billing.refresh(session.owner);return send(200,{...billing.summary(session.owner,{sandbox:sandboxSession(session)}),freeOrderId:service.freeOrder(session.owner)});}
    if(route==='/api/billing/checkout'&&req.method==='POST'){const b=await jsonBody(req,1024);if(!store.quota('checkout:'+session.owner,20,3600000))fail(429,'Too many checkout requests.');return send(200,await billing.checkout(session,b.planId));}
    if(route==='/api/billing/portal'&&req.method==='POST'){await jsonBody(req,1024);return send(200,await billing.portal(session));}
    if(config.billingRequired&&(!((route==='/api/orders'&&req.method==='POST')||(/^\/api\/orders\/cl_[a-f0-9]{32}$/.test(route)&&req.method==='PUT')||route.endsWith('/duplicate')||route==='/api/uploads'||route==='/api/job-import')&&((req.method!=='GET'&&req.method!=='HEAD'&&req.method!=='DELETE'&&!['/api/support'].includes(route))||route.startsWith('/api/download/')))){await billing.checkCatalog();await billing.refresh(session.owner);}
    if(req.method==='POST'&&route==='/api/job-import'){if(!store.quota('job-import:'+session.owner,15,3600000))fail(429,'Announcement import limit reached.');const b=await jsonBody(req,2048);if(b.consent!==true)fail(400,'Consent is required.');return send(200,await imports.job(b.url));}
    if(req.method==='POST'&&route==='/api/import-resume'){const b=await jsonBody(req,22000);if(b.consent!==true)fail(400,'Consent is required.');if(typeof b.text!=='string'||b.text.trim().length<50||b.text.length>18000)fail(400,'Paste 50–18000 characters of résumé text.');billing.reserveGeneration(session.owner);return send(200,await imports.resume(b.text,{apiKey:config.apiKey,model:config.model,reserveCall:()=>service.reserveCall()}));}
    if(req.method==='POST'&&route==='/api/uploads'){if(!store.quota('upload:'+session.owner,15,3600000))fail(429,'Upload limit reached.');const upload=await jsonBody(req,2900000);if(upload.consent!==true)fail(400,'Consent is required before processing an upload.');return send(200,await extractUpload(upload,config));}
    if(req.method==='POST'&&route==='/api/support'){const b=await jsonBody(req,5000);return send(201,service.support(session,b.message));}
    if(route==='/api/orders'){
     if(req.method==='GET')return send(200,{orders:service.list(session)});
     if(req.method==='POST')return send(201,service.create(await jsonBody(req),session));
    }
    const match=route.match(/^\/api\/orders\/(cl_[a-f0-9]{32})(?:\/(generate|revise|approve|draft|download|checkout|manual|duplicate|history))?$/);
    if(match){const [,id,action]=match;
     if(req.method==='GET'&&action==='history')return send(200,service.versions(id,session));
     if(req.method==='POST'&&action==='duplicate')return send(201,service.duplicate(id,session));
     if(req.method==='GET'&&!action)return send(200,service.view(service.own(id,session)));
     if(req.method==='DELETE'&&!action){service.remove(id,session);return send(200,{deleted:true});}
     if(req.method==='PUT'&&!action)return send(200,service.update(id,session,await jsonBody(req)));
     if(req.method==='POST'&&['generate','revise'].includes(action)){const b=await jsonBody(req,5000);return send(202,service.queue(id,session,b.instructions,b.section));}
     if(req.method==='POST'&&action==='manual'){await jsonBody(req,1024);return send(200,service.manual(id,session));}
     if(req.method==='PUT'&&action==='draft'){const b=await jsonBody(req,50000);return send(200,await service.editDraft(id,session,b.draft,{manualReviewOnly:b.manualReviewOnly===true}));}
     if(req.method==='POST'&&action==='checkout')fail(503,'Legacy checkout is unavailable while new subscription plans are being built.');
     if(req.method==='POST'&&action==='approve')return send(200,service.approve(id,session,await jsonBody(req,2000)));
     if(req.method==='POST'&&action==='download'){const b=await jsonBody(req,1024);return send(200,{url:service.downloadLink(id,session,b.filename)});}
    }
    if(req.method==='GET'&&/^\/api\/download\/[A-Za-z0-9_-]{43}$/.test(route)){const file=service.download(route.split('/').pop(),session);return send(200,file.bytes,file.filename.endsWith('.pdf')?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document',{'Content-Disposition':'attachment; filename="'+file.filename+'"'});}
    fail(404,'Not found.');
   }
   if(!['GET','HEAD'].includes(req.method))return send(405,'Method not allowed','text/plain');
   const filename=ROUTES[route];if(!filename)return send(404,'Not found','text/plain');
   let data=await fs.readFile(path.join(__dirname,filename));if(filename.endsWith('.html')){data=advertising.decorate(consistentSiteLayout(data.toString('utf8')),url,ads);if(data.includes('<script src="/advertising.js" defer>'))headers['Content-Security-Policy']="default-src 'self'; script-src 'self' https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.google.com https://*.gstatic.com https://*.doubleclick.net https://fundingchoicesmessages.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.googlesyndication.com https://*.google.com https://*.gstatic.com https://*.doubleclick.net; connect-src 'self' https://*.googlesyndication.com https://*.google.com https://*.doubleclick.net https://fundingchoicesmessages.google.com; frame-src https://*.googlesyndication.com https://*.google.com https://*.doubleclick.net https://fundingchoicesmessages.google.com; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'";}const visitorCookie=analytics.recordVisit(store,req,route,config.production);return send(200,data,MIME[path.extname(filename)]||'text/plain',visitorCookie?{'Set-Cookie':visitorCookie}:{});
  }catch(error){const status=error.status||500;if(status>=500)console.error(JSON.stringify({event:'request_failed',requestId,status,category:error.name==='Error'?'operation':error.name}));if(status>=500&&status!==503&&service&&store&&config.adminEmail){try{if(store.quota('owner-error-alert',1,900000))service.enqueueMail(config.adminEmail,'Server error on resumebuilder.shop',(req.method+' '+String(req.url||'').split('?')[0].slice(0,120)+' failed ('+(error.name||'Error')+') at '+new Date().toISOString().slice(0,16).replace('T',' ')+' UTC.\n\nNo customer data is included in this alert. Check the Railway logs for details. You will get at most one of these every 15 minutes.'),'error-alert-'+Date.now());}catch{}}send(status,{error:status<500?error.message:status===503?error.message:'Unable to complete this request. Please retry or contact support.'});}
 });
 server.requestTimeout=20000;server.headersTimeout=10000;server.maxHeadersCount=50;
 let timer,reportTimer,backupTimer,reportBusy=false,backupBusy=false;
 const backupCheck=async()=>{if(backupBusy)return;backupBusy=true;try{await backups.runScheduled(store,path.join(config.dataDir,'backups'));}catch{console.error('Scheduled encrypted backup failed');if(store.quota('backup-alert',1,86400000))service?.enqueueMail(config.adminEmail,'CareerLaunch AI: backup needs attention','Review the backup status in the administrator dashboard. Current local backup may be unavailable.','backup-alert-'+new Date().toISOString().slice(0,10));}finally{backupBusy=false;}};
 const reportCheck=async()=>{if(reportBusy)return;reportBusy=true;try{await sendWeeklyReport({store,config});}catch{console.error('Weekly report delivery failed; will retry.');}finally{reportBusy=false;}};
 server.on('listening',()=>{if(config.production&&ownStore){backupCheck();backupTimer=setInterval(backupCheck,3600000);backupTimer.unref();}if(config.production&&billing&&config.billingConfigured){billing.checkCatalog().then(()=>console.info('Stripe preflight: catalog verified')).catch(error=>console.error('Stripe preflight',{stage:billing.catalogStage||'configuration',type:error.type||error.name||'unknown',status:Number(error.statusCode)||null,code:typeof error.code==='string'?error.code.slice(0,60):null}));}if((config.enabled||config.sandboxEnabled||config.adminPreviewEnabled)&&service){timer=setInterval(()=>service.tick().catch(()=>{}),2000);timer.unref();}if(store&&config.emailKey&&config.adminEmail){reportCheck();reportTimer=setInterval(reportCheck,15*60000);reportTimer.unref();}});
 server.on('close',()=>{clearInterval(timer);clearInterval(reportTimer);clearInterval(backupTimer);if(ownStore)store.close();});
 server.service=service;server.billing=billing;return server;
}
const app=createApp();
if(require.main===module){app.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>{console.log('CareerLaunch AI is listening');const cfg=configuration();if(cfg.production&&process.env.INDEXNOW_DISABLED!=='true')setTimeout(()=>fs.readFile(path.join(__dirname,'sitemap.xml'),'utf8').then(xml=>seo.submitIndexNow(cfg.baseUrl,xml)).then(r=>console.log('IndexNow',r.status,r.count+' URLs')).catch(()=>{}),90000).unref();});for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>app.close(()=>process.exit(0)));}
module.exports=app;module.exports.createApp=createApp;

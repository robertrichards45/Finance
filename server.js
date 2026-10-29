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
const {sendWeeklyReport}=require('./lib/weekly-report');
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml','.xml':'application/xml; charset=utf-8'};
const ROUTES={'/':'index.html','/index.html':'index.html','/start':'start.html','/portal':'portal.html','/admin':'admin.html','/services':'services.html','/resume-builder':'resume-builder.html','/federal-resume-guide':'federal-resume-guide.html','/federal':'federal.html','/private-sector':'private-sector.html','/contact':'contact.html','/policies':'policies.html','/privacy.html':'privacy.html','/terms.html':'terms.html','/templates':'templates.html','/templates.html':'templates.html','/templates.js':'templates.js','/site-assistant.js':'site-assistant.js','/builder-preview.js':'builder-preview.js','/order.html':'order.html','/order.js':'order.js','/app.js':'app.js','/styles.css':'styles.css','/robots.txt':'robots.txt','/sitemap.xml':'sitemap.xml','/mark.svg':'mark.svg'};
function consistentSiteLayout(html){
 const nav="<header class=\"site-header\"><a class=\"logo\" href=\"/\">CareerLaunch<span>AI</span><span class=\"logo-dot\" aria-hidden=\"true\"></span></a><nav aria-label=\"Main navigation\"><a href=\"/resume-builder\">Résumé builder</a><a href=\"/services\">Services</a><a href=\"/templates\">Résumé designs</a><a href=\"/#pricing\">Pricing</a><a href=\"/#how\">How it works</a><a href=\"/portal\" class=\"nav-portal\">My applications <span aria-hidden=\"true\">↗</span></a></nav></header>";
 const chat="<aside class=\"career-chat\" aria-label=\"CareerLaunch AI help\"><button id=\"career-chat-toggle\" class=\"career-chat-toggle\" type=\"button\" aria-controls=\"career-chat-panel\" aria-expanded=\"false\">Ask CareerLaunch AI ✦</button><section id=\"career-chat-panel\" class=\"career-chat-panel\" hidden><h2>Ask about résumés or federal hiring</h2><p class=\"fine\">Pricing, templates, cover letters, USAJOBS, veterans’ preference, military spouse hiring, and more. Guidance is informational; verify current rules with OPM and the hiring agency.</p><div id=\"career-chat-history\" class=\"career-chat-history\" role=\"log\" aria-live=\"polite\"><p class=\"career-chat-message career-chat-assistant\">Hi! What would you like to know about résumés, federal applications, or CareerLaunch AI?</p></div><form id=\"career-chat-form\"><label for=\"career-chat-question\">Your question</label><textarea id=\"career-chat-question\" rows=\"2\" maxlength=\"800\" required minlength=\"3\" placeholder=\"Do I qualify for veterans’ preference?\"></textarea><button class=\"button small\" id=\"career-chat-submit\" type=\"submit\">Ask question</button></form><p class=\"fine\">Do not share SSNs or other sensitive personal information.</p></section></aside>";
 let result=html.replace(/<header class="site-header">[\s\S]*?<\/header>/i,nav);
 if(!result.includes('id="career-chat-toggle"'))result=result.replace(/<\/body>/i,chat+'</body>');
 if(!result.includes('src="/site-assistant.js"'))result=result.replace(/<\/head>/i,'<script src="/site-assistant.js" defer></script></head>');
 return result;
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
function createApp({config=configuration(),store,service,billing:billingOverride}={}){
 let ownStore=false;
 if(!store&&config.dataDir&&/^[a-f0-9]{64}$/i.test(config.encryptionKey||'')){store=new Store({directory:config.dataDir,key:config.encryptionKey});ownStore=true;}
 service=service||(store?new Service(store,config):null);
 const billing=billingOverride||service?.billing||(store?new Billing(store,config,{notify:({caseId,type})=>service?.enqueueMail(config.adminEmail,'CareerLaunch billing needs attention','Review the billing case in the administrator dashboard: '+caseId+' ('+type+').','billing-'+caseId+'-'+type)}):null);if(service)service.billing=billing;
 const sandboxSession=session=>Boolean(config.sandboxEnabled&&session?.admin);
 const rate=new Map();let lastPrune=0;
 const server=http.createServer(async(req,res)=>{
  const headers={'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Permissions-Policy':'camera=(), microphone=(), geolocation=()','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'",'Cache-Control':'no-store','X-Robots-Tag':'noindex'};
  if(config.production)headers['Strict-Transport-Security']='max-age=31536000';
  function send(status,body,type='application/json; charset=utf-8',extra={}){if(res.writableEnded)return;res.writeHead(status,{...headers,'Content-Type':type,...extra});res.end(req.method==='HEAD'?undefined:(type.startsWith('application/json')?JSON.stringify(body):body));}
  try{
   const url=new URL(req.url,'http://localhost'),route=url.pathname;
   if(req.headers.host==='www.resumebuilder.shop'&&['GET','HEAD'].includes(req.method))return send(308,'','text/plain',{Location:config.baseUrl+url.pathname+url.search});
   if(['GET','HEAD'].includes(req.method)&&['/','/index.html','/services','/resume-builder','/federal-resume-guide','/federal','/private-sector','/contact','/policies','/privacy.html','/terms.html','/sitemap.xml','/robots.txt'].includes(route))delete headers['X-Robots-Tag'];
   if(route==='/api/stripe/webhook'&&req.method==='POST'){
    if(!billing||!config.billingConfigured)return send(503,{error:'Billing webhook is not configured'});
    const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>131072)fail(413,'Webhook too large');chunks.push(chunk);}
    const event=billing.verify(Buffer.concat(chunks),req.headers['stripe-signature']);await billing.event(event);return send(200,{received:true});
   }
   if(route==='/health')return send(200,{status:'ok',service:'careerlaunch-ai',checkoutEnabled:Boolean(config.checkoutEnabled),intakeEnabled:config.enabled});
   if(route==='/api/config'){const qa=sandboxSession(service?.session(cookie(req)));return send(200,{intakeEnabled:Boolean(config.enabled||qa),sandboxTestAccess:Boolean(config.adminPreviewEnabled),checkoutEnabled:Boolean(config.checkoutEnabled||qa&&config.sandboxCheckoutEnabled),billingTestMode:!config.stripeLive,aiDraftsPerMonth:config.aiDraftsPerMonth,priceCents:config.priceCents,documentUploads:Boolean(config.clamavHost),retentionDays:config.retentionDays});}
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
   if(route.startsWith('/api/')){
    if(!service||!store)fail(503,'Customer services are not open yet. Please use the sample preview.');
    const now=Date.now();if(now-lastPrune>60000){for(const [k,v]of rate)if(v.until<now)rate.delete(k);lastPrune=now;}
    const ip=req.socket.remoteAddress||'unknown',entry=rate.get(ip)||{count:0,until:now+60000};if(++entry.count>180)fail(429,'Too many requests. Try again shortly.');rate.set(ip,entry);
    const mutating=!['GET','HEAD'].includes(req.method);
    if(mutating&&!allowedBrowserOrigin(req,config))fail(403,'Request origin is not allowed.');
    if(req.method==='POST'&&route==='/api/auth/login'){if(!config.enabled&&!config.adminPreviewEnabled)fail(503,'Customer accounts are not open yet.');const b=await jsonBody(req,1024);if(config.enabled||typeof b.email==='string'&&b.email.trim().toLowerCase()===config.adminEmail)service.requestLogin(b.email);return send(202,{message:'Check your inbox for a private sign-in link. It expires in 15 minutes.'});}
    if(req.method==='POST'&&route==='/api/auth/verify'){if(!config.enabled&&!config.adminPreviewEnabled)fail(503,'Customer accounts are not open yet.');const b=await jsonBody(req,1024),auth=service.verifyLogin(b.token);if(!config.enabled&&!service.session(auth.session)?.admin){service.logout(auth.session);fail(503,'Private sandbox accounts only.');}return send(200,{ok:true},MIME['.json'],{'Set-Cookie':'cl_session='+auth.session+'; Path=/; HttpOnly; SameSite=Strict; Max-Age=43200'+(config.production?'; Secure':'')});}
    const session=service.session(cookie(req));if(!session)fail(401,'Sign in to continue.');
    if(mutating&&!same(req.headers['x-csrf-token'],session.data.csrf))fail(403,'Refresh the page and try again.');
    if(req.method==='GET'&&route==='/api/session')return send(200,{email:session.data.email,csrf:session.data.csrf,admin:session.admin});
    if(req.method==='POST'&&route==='/api/auth/logout'){service.logout(cookie(req));return send(200,{ok:true},MIME['.json'],{'Set-Cookie':'cl_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'+(config.production?'; Secure':'')});}
    if(req.method==='GET'&&route==='/api/admin')return send(200,service.admin(session));
    if(req.method==='GET'&&route==='/api/admin/analytics'){if(!session.admin)fail(403,'Administrator access required.');const current=analytics.weekKey();const previous=analytics.weekKey(new Date(Date.now()-7*86400000));return send(200,{current:analytics.summarize(store,current),previous:analytics.summarize(store,previous),reportEmailConfigured:Boolean(config.emailKey&&config.emailFrom&&config.adminEmail),livePaymentsConfigured:Boolean(config.billingConfigured&&config.stripeLive),definitions:'Visitors are cookie-based estimates, recognizable bots excluded; payments are verified live Stripe records; sandbox payments are separate. Gross receipts include tax and exclude refund/fee adjustments and net profit.'});}
    if(req.method==='POST'&&route==='/api/admin/support'){if(!session.admin)fail(403,'Administrator access required.');const b=await jsonBody(req,1024),r=store.get('support',b.id);if(!r)fail(404,'Request not found.');store.put('support',r.id,r.owner,'resolved',r.data);return send(200,{ok:true});}
    if(!config.enabled&&!sandboxSession(session)&&!(session.admin&&route==='/api/billing'&&req.method==='GET'))fail(503,'Customer processing is temporarily paused.');
    if(route==='/api/billing'&&req.method==='GET')return send(200,billing.summary(session.owner,{sandbox:sandboxSession(session)}));
    if(route==='/api/billing/refresh'&&req.method==='POST'){await jsonBody(req,1024);await billing.checkCatalog();await billing.refresh(session.owner);return send(200,billing.summary(session.owner,{sandbox:sandboxSession(session)}));}
    if(route==='/api/billing/checkout'&&req.method==='POST'){const b=await jsonBody(req,1024);if(!store.quota('checkout:'+session.owner,20,3600000))fail(429,'Too many checkout requests.');return send(200,await billing.checkout(session,b.planId));}
    if(route==='/api/billing/portal'&&req.method==='POST'){await jsonBody(req,1024);return send(200,await billing.portal(session));}
    if(config.billingRequired&&((req.method!=='GET'&&req.method!=='HEAD'&&req.method!=='DELETE'&&!['/api/support'].includes(route))||route.startsWith('/api/download/'))){await billing.checkCatalog();await billing.refresh(session.owner);}
    if(req.method==='POST'&&route==='/api/uploads'){if(!store.quota('upload:'+session.owner,15,3600000))fail(429,'Upload limit reached.');const upload=await jsonBody(req,2900000);if(upload.consent!==true)fail(400,'Consent is required before processing an upload.');return send(200,await extractUpload(upload,config));}
    if(req.method==='POST'&&route==='/api/support'){const b=await jsonBody(req,5000);return send(201,service.support(session,b.message));}
    if(route==='/api/orders'){
     if(req.method==='GET')return send(200,{orders:service.list(session)});
     if(req.method==='POST')return send(201,service.create(await jsonBody(req),session));
    }
    const match=route.match(/^\/api\/orders\/(cl_[a-f0-9]{32})(?:\/(generate|revise|approve|draft|download|checkout|manual))?$/);
    if(match){const [,id,action]=match;
     if(req.method==='GET'&&!action)return send(200,service.view(service.own(id,session)));
     if(req.method==='DELETE'&&!action){service.remove(id,session);return send(200,{deleted:true});}
     if(req.method==='PUT'&&!action)return send(200,service.update(id,session,await jsonBody(req)));
     if(req.method==='POST'&&['generate','revise'].includes(action)){const b=await jsonBody(req,5000);return send(202,service.queue(id,session,b.instructions));}
     if(req.method==='POST'&&action==='manual'){await jsonBody(req,1024);return send(200,service.manual(id,session));}
     if(req.method==='PUT'&&action==='draft'){const b=await jsonBody(req,50000);return send(200,await service.editDraft(id,session,b.draft));}
     if(req.method==='POST'&&action==='checkout')fail(503,'Legacy checkout is unavailable while new subscription plans are being built.');
     if(req.method==='POST'&&action==='approve')return send(200,service.approve(id,session,await jsonBody(req,2000)));
     if(req.method==='POST'&&action==='download'){const b=await jsonBody(req,1024);return send(200,{url:service.downloadLink(id,session,b.filename)});}
    }
    if(req.method==='GET'&&/^\/api\/download\/[A-Za-z0-9_-]{43}$/.test(route)){const file=service.download(route.split('/').pop(),session);return send(200,file.bytes,file.filename.endsWith('.pdf')?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document',{'Content-Disposition':'attachment; filename="'+file.filename+'"'});}
    fail(404,'Not found.');
   }
   if(!['GET','HEAD'].includes(req.method))return send(405,'Method not allowed','text/plain');
   const filename=ROUTES[route];if(!filename)return send(404,'Not found','text/plain');
   let data=await fs.readFile(path.join(__dirname,filename));if(filename.endsWith('.html'))data=consistentSiteLayout(data.toString('utf8'));const visitorCookie=analytics.recordVisit(store,req,route,config.production);return send(200,data,MIME[path.extname(filename)]||'text/plain',visitorCookie?{'Set-Cookie':visitorCookie}:{});
  }catch(error){const status=error.status||500;send(status,{error:status<500?error.message:status===503?error.message:'Unable to complete this request. Please retry or contact support.'});}
 });
 server.requestTimeout=20000;server.headersTimeout=10000;server.maxHeadersCount=50;
 let timer,reportTimer,reportBusy=false;
 const reportCheck=async()=>{if(reportBusy)return;reportBusy=true;try{await sendWeeklyReport({store,config});}catch{console.error('Weekly report delivery failed; will retry.');}finally{reportBusy=false;}};
 server.on('listening',()=>{if((config.enabled||config.sandboxEnabled||config.adminPreviewEnabled)&&service){timer=setInterval(()=>service.tick().catch(()=>{}),2000);timer.unref();}if(store&&config.emailKey&&config.adminEmail){reportCheck();reportTimer=setInterval(reportCheck,15*60000);reportTimer.unref();}});
 server.on('close',()=>{clearInterval(timer);clearInterval(reportTimer);if(ownStore)store.close();});
 server.service=service;server.billing=billing;return server;
}
const app=createApp();
if(require.main===module){app.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('CareerLaunch AI is listening'));for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>app.close(()=>process.exit(0)));}
module.exports=app;module.exports.createApp=createApp;

'use strict';
const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const {configuration}=require('./lib/config');
const {Store}=require('./lib/store');
const {Service}=require('./lib/service');
const {same,cookie,fail,jsonBody}=require('./lib/security');
const {extractUpload}=require('./lib/uploads');
const {answerQuestion}=require('./lib/site-assistant');
const {createTestCheckout,parsePaidCheckoutEvent}=require('./lib/stripe-checkout');
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml','.xml':'application/xml; charset=utf-8'};
const ROUTES={'/':'index.html','/index.html':'index.html','/start':'start.html','/portal':'portal.html','/admin':'admin.html','/services':'services.html','/resume-builder':'resume-builder.html','/federal-resume-guide':'federal-resume-guide.html','/federal':'federal.html','/private-sector':'private-sector.html','/contact':'contact.html','/policies':'policies.html','/privacy.html':'privacy.html','/terms.html':'terms.html','/templates':'templates.html','/templates.html':'templates.html','/templates.js':'templates.js','/site-assistant.js':'site-assistant.js','/builder-preview.js':'builder-preview.js','/order.html':'order.html','/order.js':'order.js','/app.js':'app.js','/styles.css':'styles.css','/robots.txt':'robots.txt','/sitemap.xml':'sitemap.xml','/mark.svg':'mark.svg'};
function createApp({config=configuration(),store,service}={}){
 let ownStore=false;
 if(!store&&config.dataDir&&/^[a-f0-9]{64}$/i.test(config.encryptionKey||'')){store=new Store({directory:config.dataDir,key:config.encryptionKey});ownStore=true;}
 service=service||(store?new Service(store,config):null);
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
    if(!config.stripeConfigured||!config.stripeTestMode||!store)return send(503,{error:'Test webhook is not configured'});
    const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>65536)fail(413,'Webhook too large');chunks.push(chunk)}
    let event;try{event=parsePaidCheckoutEvent(Buffer.concat(chunks),req.headers['stripe-signature'],config.stripeWebhookSecret)}catch{return send(400,{error:'Invalid Stripe event'})}
    if(event){const order=store.get('order',event.orderId);if(!order||event.amountTotal!==config.priceCents||event.currency!=='usd'||order.data.checkoutSessionId!==event.sessionId)return send(400,{error:'Checkout does not match order'});
     store.transaction(()=>{const latest=store.get('order',event.orderId);if(!latest||latest.data.checkoutSessionId!==event.sessionId)fail(400,'Checkout session changed');if(!store.get('stripe_event',event.eventId)&&latest.data.payment?.status!=='paid_test'){store.put('stripe_event',event.eventId,latest.owner,'processed',{orderId:latest.id,sessionId:event.sessionId});store.put('order',latest.id,latest.owner,latest.status,{...latest.data,payment:{status:'paid_test',sessionId:event.sessionId,amount:event.amountTotal,currency:'usd',recordedAt:Date.now()}})}})}
    return send(200,{received:true});
   }
   if(route==='/health')return send(200,{status:'ok',service:'careerlaunch-ai',checkoutEnabled:Boolean(config.enabled&&config.stripeConfigured&&config.stripeTestMode),intakeEnabled:config.enabled});
   if(route==='/api/config')return send(200,{intakeEnabled:config.enabled,checkoutEnabled:Boolean(config.enabled&&config.stripeConfigured&&config.stripeTestMode),priceCents:config.priceCents,documentUploads:Boolean(config.clamavHost),retentionDays:config.retentionDays});
   if(route==='/api/site-assistant'&&req.method==='POST'){
    if(req.headers.origin!==config.baseUrl)fail(403,'Request origin is not allowed.');
    const now=Date.now(),ip=req.socket.remoteAddress||'unknown',key='assistant:'+ip;
    const previous=rate.get(key);const entry=previous&&previous.until>now?previous:{count:0,until:now+3600000};
    if(++entry.count>12)fail(429,'Assistant question limit reached. Please try again later.');
    rate.set(key,entry);
    const body=await jsonBody(req,2048);
    if(!body||typeof body.question!=='string')fail(400,'Enter a question.');
    const result=await answerQuestion(body.question,{apiKey:config.apiKey,model:config.model});
    return send(200,result);
   }
   if(route.startsWith('/api/')){
    if(!service||!store)fail(503,'Customer services are not open yet. Please use the sample preview.');
    const now=Date.now();if(now-lastPrune>60000){for(const [k,v]of rate)if(v.until<now)rate.delete(k);lastPrune=now;}
    const ip=req.socket.remoteAddress||'unknown',entry=rate.get(ip)||{count:0,until:now+60000};if(++entry.count>180)fail(429,'Too many requests. Try again shortly.');rate.set(ip,entry);
    const mutating=!['GET','HEAD'].includes(req.method);
    if(mutating&&req.headers.origin!==config.baseUrl)fail(403,'Request origin is not allowed.');
    if(req.method==='POST'&&route==='/api/auth/login'){if(!config.enabled)fail(503,'Customer accounts are not open yet.');const b=await jsonBody(req,1024);service.requestLogin(b.email);return send(202,{message:'Check your inbox for a private sign-in link. It expires in 15 minutes.'});}
    if(req.method==='POST'&&route==='/api/auth/verify'){if(!config.enabled)fail(503,'Customer accounts are not open yet.');const b=await jsonBody(req,1024),auth=service.verifyLogin(b.token);return send(200,{ok:true},MIME['.json'],{'Set-Cookie':'cl_session='+auth.session+'; Path=/; HttpOnly; SameSite=Strict; Max-Age=43200'+(config.production?'; Secure':'')});}
    const session=service.session(cookie(req));if(!session)fail(401,'Sign in to continue.');
    if(mutating&&!same(req.headers['x-csrf-token'],session.data.csrf))fail(403,'Refresh the page and try again.');
    if(req.method==='GET'&&route==='/api/session')return send(200,{email:session.data.email,csrf:session.data.csrf,admin:session.admin});
    if(req.method==='POST'&&route==='/api/auth/logout'){service.logout(cookie(req));return send(200,{ok:true},MIME['.json'],{'Set-Cookie':'cl_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'+(config.production?'; Secure':'')});}
    if(req.method==='GET'&&route==='/api/admin')return send(200,service.admin(session));
    if(req.method==='POST'&&route==='/api/admin/support'){if(!session.admin)fail(403,'Administrator access required.');const b=await jsonBody(req,1024),r=store.get('support',b.id);if(!r)fail(404,'Request not found.');store.put('support',r.id,r.owner,'resolved',r.data);return send(200,{ok:true});}
    if(!config.enabled)fail(503,'Customer processing is temporarily paused.');
    if(req.method==='POST'&&route==='/api/uploads'){if(!store.quota('upload:'+session.owner,15,3600000))fail(429,'Upload limit reached.');const upload=await jsonBody(req,2900000);if(upload.consent!==true)fail(400,'Consent is required before processing an upload.');return send(200,await extractUpload(upload,config));}
    if(req.method==='POST'&&route==='/api/support'){const b=await jsonBody(req,5000);return send(201,service.support(session,b.message));}
    if(route==='/api/orders'){
     if(req.method==='GET')return send(200,{orders:service.list(session)});
     if(req.method==='POST')return send(201,service.create(await jsonBody(req),session));
    }
    const match=route.match(/^\/api\/orders\/(cl_[a-f0-9]{32})(?:\/(generate|revise|approve|draft|download|checkout))?$/);
    if(match){const [,id,action]=match;
     if(req.method==='GET'&&!action)return send(200,service.view(service.own(id,session)));
     if(req.method==='DELETE'&&!action){service.remove(id,session);return send(200,{deleted:true});}
     if(req.method==='PUT'&&!action)return send(200,service.update(id,session,await jsonBody(req)));
     if(req.method==='POST'&&['generate','revise'].includes(action)){const b=await jsonBody(req,5000);return send(202,service.queue(id,session,b.instructions));}
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
   const data=await fs.readFile(path.join(__dirname,filename));return send(200,data,MIME[path.extname(filename)]||'text/plain');
  }catch(error){const status=error.status||500;send(status,{error:status<500?error.message:status===503?error.message:'Unable to complete this request. Please retry or contact support.'});}
 });
 server.requestTimeout=20000;server.headersTimeout=10000;server.maxHeadersCount=50;
 let timer;
 server.on('listening',()=>{if(config.enabled&&service){timer=setInterval(()=>service.tick().catch(()=>{}),2000);timer.unref();}});
 server.on('close',()=>{clearInterval(timer);if(ownStore)store.close();});
 server.service=service;return server;
}
const app=createApp();
if(require.main===module){app.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('CareerLaunch AI is listening'));for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>app.close(()=>process.exit(0)));}
module.exports=app;module.exports.createApp=createApp;

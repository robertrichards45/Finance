'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {setup}=require('./fixtures/billing');const {Service}=require('../lib/service');const {configuration}=require('../lib/config');const {createApp}=require('../server');
const input={type:'private',name:'Fictional Applicant',contact:'fictional@example.test',role:'Program Analyst',skills:'Operational reporting, scheduling',education:'',jobPosting:'Prepare operational reports and coordinate internal training schedules.',consent:true,jobs:[{title:'Coordinator',employer:'Example Company',location:'Example City',start:'2021-01',end:'Present',hours:'40',facts:'Prepared operational reports and coordinated internal training schedules for leadership.'}]};
const draft=()=>({summary:'Coordinator experienced in preparing operational reports and coordinating internal training schedules.',skills:['Operational reporting','Scheduling'],experience:[{jobId:'job0',bullets:[{text:'Prepared operational reports for leadership.',evidence:'Prepared operational reports'}]}],coverLetter:'Dear Hiring Manager,\nI am applying for the Program Analyst role. My experience includes preparing operational reports and coordinating internal training schedules for leadership. I would welcome a discussion about this relevant experience.',verificationQuestions:[]});
const editorial={version:1,passed:true,checks:{accuracy:'pass',targeting:'pass',specificity:'pass',coverLetter:'pass',readability:'pass'},issues:[],requirements:[{requirement:'Prepare operational reports',status:'supported',evidence:'Prepared operational reports'}]};
function fixture(){const s=setup(),config={...configuration({}),...s.config,production:false,enabled:true,ready:true,blockers:[],billingRequired:true,authSecret:'s'.repeat(64),adminEmail:'admin@example.test',encryptionKey:'a'.repeat(64),retentionDays:30,maxJobsPerDay:20,model:'fixture',apiKey:'fixture-only'};const service=new Service(s.store,config,{sendEmail:async()=>{},generate:async()=>({draft:draft(),editorial}),review:async()=>({editorial})});service.billing=s.billing;s.billing.config=config;
 const login=(email='fictional@example.test')=>{service.requestLogin(email);const mail=s.store.list('mail').find(r=>r.data.email===email&&r.data.message?.includes('#token='));const auth=service.verifyLogin(mail.data.message.split('#token=')[1]);return {...service.session(auth.session),token:auth.session};};
 const user=login();s.user.owner=user.owner;s.user.data=user.data;return {...s,config,service,login,user};}
test('authenticated purchase -> signed webhook -> generation -> factual approval -> real files; refund removes access',async()=>{
 const s=fixture(),app=createApp({config:s.config,store:s.store,service:s.service,billing:s.billing});app.listen(0);await new Promise(r=>app.once('listening',r));const base='http://127.0.0.1:'+app.address().port,headers={Origin:s.config.baseUrl,'Content-Type':'application/json',Cookie:'cl_session='+s.user.token,'X-CSRF-Token':s.user.data.csrf};
 const request=(route,body={},method='POST',extra={})=>fetch(base+route,{method,headers:{...headers,...extra},body:JSON.stringify(body)});
 const webhook=async event=>{const payload=JSON.stringify(event),signature=s.sdk.webhooks.generateTestHeaderString({payload,secret:s.config.stripeWebhookSecret});return fetch(base+'/api/stripe/webhook',{method:'POST',headers:{'Stripe-Signature':signature,'Content-Type':'application/json'},body:payload});};
 try{
  assert.equal((await fetch(base+'/api/billing')).status,401);assert.equal((await request('/api/orders',input)).status,201);
  assert.equal((await request('/api/billing/checkout',{planId:'monthly'},'POST',{Origin:'https://evil.example'})).status,403);
  assert.equal((await request('/api/billing/checkout',{planId:'monthly'},'POST',{'X-CSRF-Token':'wrong'})).status,403);
  const checkout=await request('/api/billing/checkout',{planId:'monthly'});assert.equal(checkout.status,200);assert.equal((await checkout.json()).testMode,true);
  assert.equal((await fetch(base+'/api/stripe/webhook',{method:'POST',body:'{}'})).status,400);
  const paid=await s.paid('monthly',{settle:false});assert.equal(s.billing.access(s.user.owner).active,false);
  const event=s.event('checkout.session.completed',paid);assert.equal((await webhook(event)).status,200);assert.equal((await webhook(event)).status,200);assert.equal(s.billing.access(s.user.owner).active,true);
  const created=await request('/api/orders',input);assert.equal(created.status,201);const order=await created.json();
  assert.equal((await request('/api/orders/'+order.id+'/generate')).status,202);await s.service.tick();assert.equal(s.service.own(order.id,s.user).status,'review');
  assert.equal((await request('/api/orders/'+order.id+'/download',{filename:'resume.pdf'})).status,404);
  const answers={workHistory:true,dates:true,education:true,credentials:true,achievements:true,targetJob:true};assert.equal((await request('/api/orders/'+order.id+'/approve',answers)).status,200);
  for(const filename of ['resume.pdf','resume.docx','cover.pdf','cover.docx']){const link=await (await request('/api/orders/'+order.id+'/download',{filename})).json();const file=await fetch(base+link.url,{headers});assert.equal(file.status,200);assert.ok((await file.arrayBuffer()).byteLength>500);assert.equal((await fetch(base+link.url,{headers})).status,404);}
  const other=s.login('other@example.test');assert.equal((await fetch(base+'/api/orders/'+order.id,{headers:{Cookie:'cl_session='+other.token}})).status,404);
  const last=await (await request('/api/orders/'+order.id+'/download',{filename:'resume.pdf'})).json();assert.equal((await webhook(s.event('charge.refunded',{id:'ch_fixture'}))).status,200);
  assert.equal((await fetch(base+last.url,{headers})).status,402);assert.equal((await request('/api/orders/'+order.id,{},'DELETE')).status,200);
 }finally{await new Promise(r=>app.close(r));s.close();}
});
test('seven-day pass allows manual editing and exactly three AI requests',async()=>{const s=fixture();try{await s.paid('access7');const o=s.service.create(input,s.user);for(let i=0;i<3;i++)s.billing.reserveGeneration(s.user.owner);assert.throws(()=>s.billing.reserveGeneration(s.user.owner),/7-Day Access AI requests/);s.service.manual(o.id,s.user);assert.equal(s.service.own(o.id,s.user).status,'review');assert.equal(s.service.own(o.id,s.user).data.files,null);await s.service.editDraft(o.id,s.user,draft());assert.equal(s.service.own(o.id,s.user).data.quality.editorial.passed,true);}finally{s.close();}});

test('private sandbox permits only the owner while public signup and payments stay closed',async()=>{const s=fixture();Object.assign(s.config,{enabled:false,checkoutEnabled:false,sandboxEnabled:true,sandboxCheckoutEnabled:true});const app=createApp({config:s.config,store:s.store,service:s.service,billing:s.billing});app.listen(0);await new Promise(r=>app.once('listening',r));const base='http://127.0.0.1:'+app.address().port;try{const publicState=await (await fetch(base+'/api/config')).json();assert.equal(publicState.intakeEnabled,false);assert.equal(publicState.checkoutEnabled,false);const before=s.store.list('login').length;const response=await fetch(base+'/api/auth/login',{method:'POST',headers:{Origin:s.config.baseUrl,'Content-Type':'application/json'},body:JSON.stringify({email:'not-owner@example.test'})});assert.equal(response.status,503);assert.equal(s.store.list('login').length,before);const admin=s.login(s.config.adminEmail);const headers={Origin:s.config.baseUrl,'Content-Type':'application/json',Cookie:'cl_session='+admin.token,'X-CSRF-Token':admin.data.csrf};const privateState=await (await fetch(base+'/api/config',{headers})).json();assert.equal(privateState.intakeEnabled,true);assert.equal(privateState.checkoutEnabled,true);const publicCookie={...headers,Cookie:'cl_session='+s.user.token,'X-CSRF-Token':s.user.data.csrf};assert.equal((await fetch(base+'/api/billing/checkout',{method:'POST',headers:publicCookie,body:JSON.stringify({planId:'access7'})})).status,503);assert.equal((await fetch(base+'/api/billing/checkout',{method:'POST',headers,body:JSON.stringify({planId:'access7'})})).status,200);}finally{await new Promise(r=>app.close(r));s.close();}});

test('purchase-first login email retains a selected plan but never arbitrary redirect values',()=>{const s=fixture();try{const email='plan-buyer@example.test';s.service.requestLogin(email,'annual');const message=s.store.list('mail').find(r=>r.data.email===email)?.data.message;assert.match(message,/\/portal\?plan=annual#token=/);const badEmail='unsafe-plan@example.test';s.service.requestLogin(badEmail,'https://evil.example/');const unsafe=s.store.list('mail').find(r=>r.data.email===badEmail)?.data.message;assert.match(unsafe,/\/portal#token=/);assert.doesNotMatch(unsafe,/evil\.example/);}finally{s.close();}});

test('signed seven-day purchase unlocks editable Word/PDF documents, and expiry blocks retained links',async()=>{
 const s=fixture(),app=createApp({config:s.config,store:s.store,service:s.service,billing:s.billing});
 app.listen(0);await new Promise(resolve=>app.once('listening',resolve));
 const base='http://127.0.0.1:'+app.address().port,headers={Origin:s.config.baseUrl,'Content-Type':'application/json',Cookie:'cl_session='+s.user.token,'X-CSRF-Token':s.user.data.csrf};
 const request=(route,body={},method='POST')=>fetch(base+route,{method,headers,body:JSON.stringify(body)});
 try{
  assert.equal((await request('/api/orders',input)).status,201,'application facts can be saved before payment');
  const checkout=await request('/api/billing/checkout',{planId:'access7'});
  assert.equal(checkout.status,200);
  assert.match((await checkout.json()).url,/^https:\/\/checkout\.stripe\.com\//);
  const pending=await (await fetch(base+'/api/billing',{headers})).json();
  assert.equal(pending.lastCheckout.status,'pending');
  assert.equal(pending.access.active,false);
  const stripe=Object.values(s.sessions)[0];
  stripe.status='complete';stripe.payment_status='paid';
  const event=s.event('checkout.session.completed',stripe,'evt_seven_day_paid');
  const payload=JSON.stringify(event);
  assert.equal((await fetch(base+'/api/stripe/webhook',{method:'POST',headers:{'Stripe-Signature':'invalid'},body:payload})).status,400);
  assert.equal(s.billing.access(s.user.owner).active,false);
  const signature=s.sdk.webhooks.generateTestHeaderString({payload,secret:s.config.stripeWebhookSecret});
  const hook=()=>fetch(base+'/api/stripe/webhook',{method:'POST',headers:{'Stripe-Signature':signature},body:payload});
  assert.equal((await hook()).status,200);
  assert.equal((await hook()).status,200,'duplicate webhooks are harmless');
  const paid=await (await fetch(base+'/api/billing',{headers})).json();
  assert.equal(paid.lastCheckout.status,'paid');
  assert.equal(paid.access.planId,'access7');
  assert.equal(paid.access.active,true);
  assert.equal(paid.access.ai,true,'the 7-day pass includes a small AI allowance');
  const created=await request('/api/orders',input);assert.equal(created.status,201);
  const order=await created.json();
  assert.equal((await request('/api/orders/'+order.id+'/manual')).status,200);
  assert.equal((await request('/api/orders/'+order.id+'/draft',{draft:draft()},'PUT')).status,200);
  const answers={workHistory:true,dates:true,education:true,credentials:true,achievements:true,targetJob:true};
  assert.equal((await request('/api/orders/'+order.id+'/approve',answers)).status,200);
  const kinds=['resume.pdf','resume.docx','cover.pdf','cover.docx'];
  for(const filename of kinds){const response=await request('/api/orders/'+order.id+'/download',{filename});assert.equal(response.status,200,filename);const path=(await response.json()).url;const file=await fetch(base+path,{headers});assert.equal(file.status,200,filename);assert.ok((await file.arrayBuffer()).byteLength>500,filename);}
  const held=(await (await request('/api/orders/'+order.id+'/download',{filename:'resume.pdf'})).json()).url;
  s.setTime(paid.access.expiresAt+1);
  const after=await (await fetch(base+'/api/billing',{headers})).json();
  assert.equal(after.access.active,false);
  assert.equal((await fetch(base+held,{headers})).status,402,'expired subscriptions cannot use previously issued download links');
 }finally{await new Promise(resolve=>app.close(resolve));s.close();}
});

test('HTTP import buttons reach the correct pipelines and structured extraction requires Pro',async()=>{const s=fixture();let jobs=0,resumes=0;const imports={job:async url=>{jobs++;assert.equal(url,'https://www.usajobs.gov/job/123');return {text:'Fictional announcement text for review.',sourceUrl:url,reviewRequired:true};},resume:async text=>{resumes++;assert.ok(text.startsWith('Example'));return {jobs:[],skills:'Excel',education:'',questions:['Confirm dates.'],reviewRequired:true};}};const app=createApp({config:s.config,store:s.store,service:s.service,billing:s.billing,imports});app.listen(0);await new Promise(r=>app.once('listening',r));const base='http://127.0.0.1:'+app.address().port,headers={Origin:s.config.baseUrl,'Content-Type':'application/json',Cookie:'cl_session='+s.user.token,'X-CSRF-Token':s.user.data.csrf};const post=(route,body)=>fetch(base+route,{method:'POST',headers,body:JSON.stringify(body)});try{let r=await post('/api/job-import',{url:'https://www.usajobs.gov/job/123',consent:true});assert.equal(r.status,200);assert.equal((await r.json()).reviewRequired,true);assert.equal(jobs,1);assert.equal((await fetch(base+'/api/job-import',{headers})).status,404);const data={text:'Example Services Team Assistant: prepared weekly Excel reports for the coordinator.',consent:true};assert.equal((await post('/api/import-resume',data)).status,402);assert.equal(resumes,0);await s.paid('monthly');r=await post('/api/import-resume',data);assert.equal(r.status,200);assert.equal(resumes,1);assert.equal((await r.json()).reviewRequired,true);assert.equal((await post('/api/import-resume',{...data,consent:false})).status,400);assert.equal(resumes,1);}finally{await new Promise(r=>app.close(r));s.close();}});

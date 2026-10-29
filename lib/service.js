'use strict';
const {random,hash,normalizeEmail,fail}=require('./security');
const {validateIntake,text}=require('./intake');
const {generateApplication,validateApplicationDraft}=require('./application-ai');
const {generatePackage}=require('./application-documents');
const {newOrderId}=require('./order-state');
const {assertApproval}=require('./review-checklist');
class Service{
 constructor(store,config,{generate=generateApplication,documents=generatePackage,sendEmail}={}){this.store=store;this.config=config;this.generate=generate;this.documents=documents;this.sendEmail=sendEmail||this.resend.bind(this);this.busy=false;}
 emailId(email){return hash(email,this.config.authSecret);}
 enqueueMail(email,subject,message,key){if(this.store.get('mail',key))return;this.store.put('mail',key,this.emailId(email),'queued',{email,subject,message,attempts:0,nextAttempt:Date.now()});}
 async resend({email,subject,message},id){const r=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(15000),headers:{Authorization:'Bearer '+this.config.emailKey,'Content-Type':'application/json','Idempotency-Key':id},body:JSON.stringify({from:this.config.emailFrom,to:[email],subject,text:message})});if(!r.ok)throw Error('Email delivery failed');}
 requestLogin(email){email=normalizeEmail(email);const owner=this.emailId(email);if(!this.store.quota('login:'+owner,5,3600000)||!this.store.quota('login:global',30,3600000))return;
  const token=random(),id=hash(token,this.config.authSecret);this.store.put('login',id,owner,'pending',{email,expires:Date.now()+15*60000});
  this.enqueueMail(email,'Your CareerLaunch AI sign-in link','Use this private link within 15 minutes. Do not forward it.\n\n'+this.config.baseUrl+'/portal#token='+token,'login-'+id);
 }
 verifyLogin(token){if(typeof token!=='string'||token.length>100)fail(401,'Sign-in link is invalid or expired.');return this.store.transaction(()=>{
  const id=hash(token,this.config.authSecret),record=this.store.get('login',id);if(!record||record.data.expires<Date.now())fail(401,'Sign-in link is invalid or expired.');
  this.store.delete('login',id);const session=random(),sid=hash(session,this.config.authSecret),csrf=random();
  this.store.put('session',sid,record.owner,'active',{email:record.data.email,csrf,expires:Date.now()+12*3600000});return {session,csrf};
 });}
 session(token){if(!token||token.length>100)return null;const record=this.store.get('session',hash(token,this.config.authSecret));if(!record||record.data.expires<Date.now())return null;return {...record,admin:record.data.email===this.config.adminEmail};}
 logout(token){this.store.delete('session',hash(token,this.config.authSecret));}
 own(id,session){const r=this.store.get('order',id);if(!r||r.owner!==session.owner)fail(404,'Order not found.');return r;}
 view(r){const d=r.data;return {id:r.id,status:r.status,createdAt:r.created,updatedAt:r.updated,type:d.input.type,role:d.input.role,name:d.input.name,input:d.input,draft:d.draft||null,quality:d.quality||null,revisions:d.revisions,error:d.error||null,downloadCount:d.downloadCount||0,paymentStatus:d.payment?.status||'unpaid'};}
 create(input,session){const data=validateIntake(input);if(!this.store.quota('orders:'+session.owner,5,86400000))fail(429,'Daily order limit reached.');
  const id=newOrderId();this.store.put('order',id,session.owner,'draft',{input:data,email:session.data.email,consentedAt:Date.now(),policyVersion:'2026-10-29',revisions:0,attempts:0,history:[{status:'draft',at:Date.now()}]});return this.view(this.store.get('order',id));}
 list(session){return this.store.list('order',session.owner).map(r=>({id:r.id,status:r.status,role:r.data.input.role,type:r.data.input.type,createdAt:r.created,updatedAt:r.updated}));}
 set(r,status,data={}){const value={...r.data,...data,history:[...r.data.history.slice(-39),{status,at:Date.now()}]};this.store.put('order',r.id,r.owner,status,value);return this.view(this.store.get('order',r.id));}
 update(id,session,input){const r=this.own(id,session);if(!['draft','failed','review'].includes(r.status))fail(409,'This order cannot be edited now.');return this.set(r,'draft',{input:validateIntake(input),draft:null,files:null,quality:null,error:null});}
 queue(id,session,revision){const r=this.own(id,session);if(this.config.stripeConfigured&&r.data.payment?.status!=='paid_test')fail(402,'Complete verified test checkout before generating.');if(!['draft','review','failed'].includes(r.status))fail(409,'Order is not ready to generate.');
  if(r.status==='review'&&r.data.revisions>=3)fail(400,'Three AI revisions are included. Contact support for help.');
  if((r.data.totalAttempts||0)>=10)fail(429,'Generation limit reached. Contact support.');
  return this.set(r,'queued',{revision:text(revision||'','revision notes',1200),revisions:r.data.revisions+(r.status==='review'?1:0),attempts:0,nextAttempt:Date.now(),error:null,files:null,quality:null});}
 async editDraft(id,session,raw){const r=this.own(id,session);if(this.config.stripeConfigured&&r.data.payment?.status!=='paid_test')fail(402,'Payment verification required.');if(r.status!=='review')fail(409,'Draft is not ready for review.');const draft=validateApplicationDraft(raw,r.data.input),bundle=await this.documents(r.data.input,draft);if(this.own(id,session).updated!==r.updated)fail(409,'Order changed. Refresh and try again.');return this.set(r,'review',{draft,quality:bundle.quality,files:Object.fromEntries(Object.entries(bundle.files).map(([k,v])=>[k,v.toString('base64')]))});}
 approve(id,session,answers){const r=this.own(id,session);if(this.config.stripeConfigured&&r.data.payment?.status!=='paid_test')fail(402,'Payment verification required.');if(r.status!=='review'||!r.data.files||r.data.draft.verificationQuestions.length)fail(409,'Resolve all verification questions before approving.');
  try{assertApproval(answers);}catch{fail(400,'Confirm all six factual review checks.');}
  this.set(r,'approved',{approvedAt:Date.now()});const fresh=this.own(id,session);this.set(fresh,'delivered');
  this.enqueueMail(r.data.email,'Your application documents are ready','Your reviewed Word and PDF documents are ready in your private portal:\n'+this.config.baseUrl+'/portal','approved-'+id);return this.view(this.own(id,session));}
 downloadLink(id,session,filename){const r=this.own(id,session);if(this.config.stripeConfigured&&r.data.payment?.status!=='paid_test')fail(402,'Payment verification required.');if(!['review','delivered'].includes(r.status)||!['resume.pdf','resume.docx','cover.pdf','cover.docx'].includes(filename)||!r.data.files?.[filename])fail(404,'Document is not available.');
  const token=random(),tid=hash(token,this.config.authSecret);this.store.put('download',tid,session.owner,'active',{orderId:id,filename,expires:Date.now()+5*60000});return '/api/download/'+token;}
 download(token,session){const id=hash(token,this.config.authSecret),link=this.store.get('download',id);if(!link||link.owner!==session.owner||link.data.expires<Date.now())fail(404,'Download link expired.');const r=this.own(link.data.orderId,session);if(this.config.stripeConfigured&&r.data.payment?.status!=='paid_test')fail(402,'Payment verification required.');if(!['review','delivered'].includes(r.status)||!r.data.files?.[link.data.filename])fail(404,'Document unavailable.');
  this.store.delete('download',id);this.store.put('order',r.id,r.owner,r.status,{...r.data,downloadCount:(r.data.downloadCount||0)+1});return {filename:link.data.filename,bytes:Buffer.from(r.data.files[link.data.filename],'base64')};}
 remove(id,session){const r=this.own(id,session);this.store.delete('order',r.id);for(const link of this.store.list('download',session.owner))if(link.data.orderId===id)this.store.delete('download',link.id);for(const m of this.store.list('mail',session.owner))if(m.id.includes(id))this.store.delete('mail',m.id);}
 support(session,message){const id='support_'+random();this.store.put('support',id,session.owner,'open',{message:text(message,'support message',2000,10),email:session.data.email});this.enqueueMail(session.data.email,'We received your support request','Your request is recorded. You can check its status in your private portal. Reference: '+id,'ack-'+id);this.enqueueMail(this.config.adminEmail,'CareerLaunch AI: support request','A new request is waiting in the administrator dashboard.\n'+this.config.baseUrl+'/admin','alert-'+id);return {id};}
 admin(session){if(!session.admin)fail(403,'Administrator access required.');const orders=this.store.list('order');return {counts:orders.reduce((a,r)=>(a[r.status]=(a[r.status]||0)+1,a),{}),orders:orders.map(r=>({id:r.id,status:r.status,type:r.data.input.type,createdAt:r.created,updatedAt:r.updated,error:r.data.error||null,attempts:r.data.totalAttempts||0})),mail:this.store.list('mail').reduce((a,r)=>(a[r.status]=(a[r.status]||0)+1,a),{}),support:this.store.list('support').map(r=>({id:r.id,status:r.status,message:r.data.message,createdAt:r.created})),readiness:{blockers:this.config.blockers,intakeEnabled:this.config.enabled,checkoutEnabled:false}};}
 cleanup(){const cutoff=Date.now()-this.config.retentionDays*86400000;for(const kind of ['login','session','download'])for(const r of this.store.list(kind))if(r.data.expires<Date.now())this.store.delete(kind,r.id);
  for(const kind of ['order','support','mail'])for(const r of this.store.list(kind))if(r.updated<cutoff)this.store.delete(kind,r.id);
 }
 async tick(){if(this.busy)return;this.busy=true;try{
  this.cleanup();
  for(const r of this.store.list('order'))if(r.status==='generating'&&r.updated<Date.now()-120000)this.set(r,'failed',{error:'Generation interrupted. Please retry.',files:null});
  const row=this.store.list('order').reverse().find(r=>r.status==='queued'&&(r.data.nextAttempt||0)<=Date.now());
  if(row){const day=new Date().toISOString().slice(0,10);if(!this.store.quota('ai:'+day,this.config.maxJobsPerDay,86400000)){this.set(row,'failed',{error:'Daily generation capacity reached. Try again tomorrow.'});}else{
   this.set(row,'generating',{attempts:row.data.attempts+1,totalAttempts:(row.data.totalAttempts||0)+1});
   try{const result=await this.generate(row.data.input,{apiKey:this.config.apiKey,model:this.config.model,revision:row.data.revision,previous:row.data.draft});const bundle=await this.documents(row.data.input,result.draft),current=this.store.get('order',row.id);
    if(current?.status==='generating'){this.set(current,'review',{draft:result.draft,usage:result.usage,quality:bundle.quality,files:Object.fromEntries(Object.entries(bundle.files).map(([k,b])=>[k,b.toString('base64')])),error:null});this.enqueueMail(row.data.email,'Your application draft is ready to review','Review your draft and verify every claim before approving it.\n'+this.config.baseUrl+'/portal','review-'+row.id+'-'+row.data.revisions);}
   }catch{const current=this.store.get('order',row.id);if(current?.status==='generating'){if(current.data.attempts<3)this.set(current,'queued',{nextAttempt:Date.now()+current.data.attempts*15000,error:'Generation will retry automatically.'});else{this.set(current,'failed',{error:'Generation needs attention. Retry or contact support.'});this.enqueueMail(this.config.adminEmail,'CareerLaunch AI: generation failure','An order failed after three attempts. Review the administrator dashboard. Order '+row.id,'failed-'+row.id+'-'+row.data.revisions);}}}
  }}
  const mail=this.store.list('mail').reverse().find(r=>r.status==='queued'&&r.data.nextAttempt<=Date.now());if(mail)try{await this.sendEmail(mail.data,mail.id);this.store.put('mail',mail.id,mail.owner,'sent',{sentAt:Date.now()});}catch{const attempts=mail.data.attempts+1;this.store.put('mail',mail.id,mail.owner,attempts>=4?'failed':'queued',{...mail.data,attempts,nextAttempt:Date.now()+60000*2**attempts});}
 }finally{this.busy=false;}}
}
module.exports={Service};

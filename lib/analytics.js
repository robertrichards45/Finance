'use strict';
const crypto=require('node:crypto');
const PUBLIC=new Set(['/','/index.html','/services','/resume-builder','/federal-resume-guide','/cover-letter-guide','/federal','/private-sector','/contact','/policies','/templates','/guides','/examples','/military-to-civilian-resume','/resume-employment-gaps','/federal-police-resume','/job-match-checker','/cover-letter-check','/resume-readiness-checklist','/start']);
const BOT=/bot|crawler|spider|slurp|headless|lighthouse|pagespeed|pingdom|uptimerobot|monitor|curl|wget|python-requests|google-inspectiontool|facebookexternalhit|preview|validator/i;
const COOKIE='cl_visitor';
function visitorCookie(req,production){const raw=String(req.headers.cookie||'').match(/(?:^|;\s*)cl_visitor=([a-f0-9]{32})(?:;|$)/);if(raw)return {id:raw[1],header:null};const id=crypto.randomBytes(16).toString('hex');return {id,header:COOKIE+'='+id+'; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax'+(production?'; Secure':'')};}
function isLikelyHuman(req,route){const ua=String(req.headers['user-agent']||'');return req.method==='GET'&&PUBLIC.has(route)&&ua.length>=15&&!BOT.test(ua)&&String(req.headers.accept||'').includes('text/html');}
function dayInNY(date){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
function weekKey(now=new Date()){const local=dayInNY(now);const utc=new Date(local+'T12:00:00Z');const day=utc.getUTCDay();utc.setUTCDate(utc.getUTCDate()-day);return utc.toISOString().slice(0,10);}
const SOURCES=new Set(['google','bing','duckduckgo','yahoo','facebook','instagram','linkedin','reddit','chatgpt','community','referral','video','email','other-referral','unattributed']);
function acquisition(req){
 if(req.headers['sec-gpc']==='1')return 'unattributed';
 let tagged='';
 try{tagged=(new URL(req.url,'https://resumebuilder.shop').searchParams.get('utm_source')||'').trim().toLowerCase();}catch{}
 if(SOURCES.has(tagged)&&tagged!=='unattributed')return tagged;
 const ref=req.headers.referer||req.headers.referrer||'';
 if(!ref)return 'unattributed';
 try{
  const host=new URL(ref).hostname.toLowerCase().replace(/^www\./,'');
  if(host==='resumebuilder.shop'||host.endsWith('.resumebuilder.shop'))return 'unattributed';
  if(/(^|\.)google\./.test(host))return 'google';
  if(host==='bing.com'||host.endsWith('.bing.com'))return 'bing';
  if(host==='duckduckgo.com'||host.endsWith('.duckduckgo.com'))return 'duckduckgo';
  if(host==='search.yahoo.com'||host==='yahoo.com'||host.endsWith('.yahoo.com'))return 'yahoo';
  if(host==='facebook.com'||host.endsWith('.facebook.com')||host==='fb.com')return 'facebook';
  if(host==='instagram.com'||host.endsWith('.instagram.com'))return 'instagram';
  if(host==='linkedin.com'||host.endsWith('.linkedin.com'))return 'linkedin';
  if(host==='reddit.com'||host.endsWith('.reddit.com'))return 'reddit';
  if(host==='chatgpt.com'||host.endsWith('.chatgpt.com')||host==='chat.openai.com')return 'chatgpt';
  return 'other-referral';
 }catch{return 'unattributed';}
}
function acquisitionSummary(store,week){const counts={};for(const r of store.list('visit'))if(r.data.week===week){const source=SOURCES.has(r.data.source)?r.data.source:'unattributed';counts[source]=(counts[source]||0)+1;}return {sources:counts,note:'Estimated browser visitors grouped by their first UTM tag or external referring site this week. Missing referrers are unattributed, not automatically direct or search traffic. Only source categories are stored, never referring URLs. No cross-account purchase attribution.'};}
function recordVisit(store,req,route,production){if(!store||!isLikelyHuman(req,route))return null;const visitor=visitorCookie(req,production),week=weekKey();const digest=crypto.createHash('sha256').update(week+':'+visitor.id).digest('hex');const id=week+':'+digest;const existing=store.get('visit',id);if(!existing)store.put('visit',id,'analytics','counted',{week,firstSeen:Date.now(),source:acquisition(req),landing:PUBLIC.has(route)?route:'other'});return visitor.header;}
function summarize(store,week){const visitors=store.list('visit').filter(r=>r.data.week===week).length;const payments=store.list('billing_payment:live').filter(r=>r.data.analyticsWeek===week&&r.status==='verified'&&r.data.liveMode===true&&r.data.currency==='usd');const sandbox=store.list('billing_payment:sandbox').filter(r=>r.data.analyticsWeek===week);const legacy=store.list('stripe_event').filter(r=>r.data.analyticsWeek===week);const purchasers=new Set(payments.map(r=>r.owner)).size;const sum=rows=>rows.reduce((n,r)=>n+(Number(r.data.amountCents)||0),0);return {week,estimatedVisitors:visitors,purchasers,estimatedNonPurchasers:Math.max(0,visitors-purchasers),verifiedOrders:payments.length,revenueCents:sum(payments),sandboxPayments:sandbox.length+legacy.length,sandboxRevenueCents:sum(sandbox)+sum(legacy),conversionRate:visitors?Number((100*purchasers/visitors).toFixed(1)):0};}
function emailBody(summary,baseUrl){return 'CareerLaunch AI weekly website report\nWeek starting: '+summary.week+' (America/New_York)\n\nEstimated unique browser visitors: '+summary.estimatedVisitors+'\nVerified live payments (including renewals): '+summary.verifiedOrders+'\nPurchasing accounts: '+summary.purchasers+'\nEstimated visitors without a purchase: '+summary.estimatedNonPurchasers+'\nConversion rate (approximate): '+summary.conversionRate+'%\nVerified gross live checkout payments (includes tax): $'+(summary.revenueCents/100).toFixed(2)+' USD\nSandbox test payments: '+summary.sandboxPayments+' (excluded from live receipts)\n\nThese are estimates, not verified individual humans. Bots can evade filters, cookies can be deleted, and visitors may use multiple devices. Purchasers are authenticated billing accounts, not verified individual humans. Purchases are based on verified live-mode billing records saved by this application; Tax is included in gross receipts; refunds, disputes and fees are not deducted, and this is not net profit. Visitor counts are not linked to buyers, so non-purchasers and conversion are estimates.\n\nWebsite: '+baseUrl;}
module.exports={PUBLIC,acquisition,acquisitionSummary,weekKey,dayInNY,isLikelyHuman,recordVisit,summarize,emailBody};

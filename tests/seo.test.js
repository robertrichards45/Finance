'use strict';
const test=require('node:test');
const assert=require('node:assert');
const fs=require('node:fs');
const path=require('node:path');
const seo=require('../lib/seo');

test('guide pages get Article and breadcrumb structured data', ()=>{
 const html=seo.decorate(fs.readFileSync(path.join(__dirname,'..','federal-resume-guide.html'),'utf8'),{});
 const m=html.match(/<script type="application\/ld\+json">(.*?)<\/script>/);
 const data=JSON.parse(m[1]);
 const types=data['@graph'].map(n=>n['@type']);
 assert.ok(types.includes('Article')&&types.includes('BreadcrumbList'));
 assert.ok(!/<\/script>/.test(m[1]));
});

test('tool pages are marked as web applications', ()=>{
 const html=seo.decorate(fs.readFileSync(path.join(__dirname,'..','resume-builder.html'),'utf8'),{});
 assert.match(html,/"WebApplication"/);
});

test('Bing verification only accepts a plain token', ()=>{
 assert.match(seo.decorate('<html><head></head><body></body></html>',{BING_SITE_VERIFICATION:'ABCDEF123456'}),/msvalidate\.01" content="ABCDEF123456"/);
 assert.doesNotMatch(seo.decorate('<html><head></head></html>',{BING_SITE_VERIFICATION:'"><script>'}),/msvalidate/);
 assert.match(seo.bingSiteAuth({BING_SITE_VERIFICATION:'ABCDEF123456'}),/<user>ABCDEF123456<\/user>/);
 assert.equal(seo.bingSiteAuth({}),'');
});

test('footer links to the partner sites once', ()=>{
 const html=seo.decorate('<footer><div class="footer-links"><a href="/guides">Guides</a></div></footer>',{});
 assert.equal((html.match(/vetassistance\.org/g)||[]).length,1);
});

test('IndexNow submits every sitemap URL with the hosted key', async ()=>{
 const xml=fs.readFileSync(path.join(__dirname,'..','sitemap.xml'),'utf8');
 let sent;
 const r=await seo.submitIndexNow('https://resumebuilder.shop',xml,async(url,opts)=>{sent={url,body:JSON.parse(opts.body)};return {status:202};});
 assert.ok(r.ok&&r.count>10);
 assert.equal(sent.body.host,'resumebuilder.shop');
 assert.equal(sent.body.keyLocation,'https://resumebuilder.shop/'+seo.INDEXNOW_KEY+'.txt');
 const fail=await seo.submitIndexNow('https://resumebuilder.shop',xml,async()=>{throw new Error('offline');});
 assert.equal(fail.ok,false);
});

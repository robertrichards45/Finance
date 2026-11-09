'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const app=require('../server');

let server;
let base;

test.before(async()=>{
 server=app.listen(0);
 await new Promise(resolve=>server.once('listening',resolve));
 base='http://127.0.0.1:'+server.address().port;
});
test.after(()=>server.close());

test('every sitemap URL serves indexable HTML with its own canonical URL',async()=>{
 const sitemapResponse=await fetch(base+'/sitemap.xml');
 assert.equal(sitemapResponse.status,200);
 const sitemap=await sitemapResponse.text();
 const urls=[...sitemap.matchAll(/<loc>(https:\/\/resumebuilder\.shop\/[^<]*)<\/loc>/g)].map(match=>match[1]);
 assert.ok(urls.length>=20,'All public marketing and guide pages must be included');
 assert.equal(urls.length,new Set(urls).size,'Sitemap URLs must be unique');

 const robots=(await(await fetch(base+'/robots.txt')).text()).split(/\r?\n/);
 const disallowed=robots.filter(x=>x.startsWith('Disallow: ')).map(x=>x.slice(10));
 for(const absolute of urls){
  const pathname=new URL(absolute).pathname;
  assert.equal(disallowed.some(x=>pathname===x||pathname.startsWith(x)),false,'Sitemap contains robots-blocked URL: '+pathname);
  const response=await fetch(base+pathname);
  assert.equal(response.status,200,pathname);
  assert.equal(response.headers.get('x-robots-tag'),null,pathname+' was tagged noindex');
  const html=await response.text();
  assert.ok(html.includes('<link rel="canonical" href="'+absolute+'">'),'Incorrect or missing canonical: '+pathname);
  assert.match(html,/<h1(?:\s|>)/i,'Missing main heading: '+pathname);
 }
});

test('private workflow pages remain excluded from indexing',async()=>{
 const robots=await(await fetch(base+'/robots.txt')).text();
 for(const path of ['/portal','/start','/admin','/order.html']){
  assert.ok(robots.includes('Disallow: '+path),'Missing robots exclusion: '+path);
  const r=await fetch(base+path);
  assert.equal(r.status,200,path);
  assert.equal(r.headers.get('x-robots-tag'),'noindex',path);
 }
});

test('conventional favicon request is redirected to existing SVG logo',async()=>{
 const r=await fetch(base+'/favicon.ico',{redirect:'manual'});
 assert.equal(r.status,308);
 assert.equal(r.headers.get('location'),'https://resumebuilder.shop/mark.svg');
 const icon=await fetch(base+'/mark.svg');
 assert.equal(icon.status,200);
 assert.match(icon.headers.get('content-type'),/image\/svg\+xml/);
 assert.match(await icon.text(),/<svg/);
});

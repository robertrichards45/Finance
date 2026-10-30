'use strict';
// Search-engine helpers: structured data, Bing verification, partner links, and IndexNow.
const INDEXNOW_KEY=(process.env.INDEXNOW_KEY||'9f4964de9d5fdae2b9e59fc2fffd5e81').trim();
const ARTICLES=new Set(['/cover-letter-guide','/federal-resume-guide','/military-to-civilian-resume','/resume-employment-gaps','/federal-police-resume']);
const TOOLS=new Set(['/resume-builder','/resume-readiness-checklist','/job-match-checker','/cover-letter-check']);
const PARTNERS='<a href="https://www.vetassistance.org/" rel="noopener">VA benefits help for veterans</a><a href="https://createdocuments.org/" rel="noopener">Business documents</a>';

function attr(html,re){const m=html.match(re);return m?m[1]:'';}
function esc(s){return String(s).replace(/</g,'\\u003c');}

function structuredData(html){
 const url=attr(html,/<link rel="canonical" href="([^"]+)"/i);
 if(!url)return '';
 let path;try{path=new URL(url).pathname.replace(/\/$/,'')||'/';}catch{return '';}
 const title=attr(html,/<title>([^<]+)<\/title>/i).replace(/\s*\|\s*CareerLaunch AI\s*$/,'').replace(/&amp;/g,'&');
 const description=attr(html,/<meta name="description" content="([^"]+)"/i).replace(/&amp;/g,'&');
 const org={'@type':'Organization',name:'CareerLaunch AI',url:'https://resumebuilder.shop/'};
 const graph=[];
 if(ARTICLES.has(path))graph.push({'@type':'Article',headline:title,description,url,mainEntityOfPage:url,author:org,publisher:org,inLanguage:'en-US'});
 if(TOOLS.has(path))graph.push({'@type':'WebApplication',name:title,description,url,applicationCategory:'BusinessApplication',operatingSystem:'Any (web browser)',provider:org});
 if(path!=='/'){
  const crumbs=[{'@type':'ListItem',position:1,name:'Home',item:'https://resumebuilder.shop/'}];
  if(ARTICLES.has(path))crumbs.push({'@type':'ListItem',position:2,name:'Guides',item:'https://resumebuilder.shop/guides'});
  crumbs.push({'@type':'ListItem',position:crumbs.length+1,name:title,item:url});
  graph.push({'@type':'BreadcrumbList',itemListElement:crumbs});
 }
 return graph.length?'<script type="application/ld+json">'+esc(JSON.stringify({'@context':'https://schema.org','@graph':graph}))+'</script>':'';
}

function decorate(html,env=process.env){
 let out=html;
 if(!out.includes('"@graph"')){const ld=structuredData(out);if(ld)out=out.replace(/<\/head>/i,ld+'</head>');}
 const bing=(env.BING_SITE_VERIFICATION||'').trim();
 if(bing&&/^[A-Za-z0-9_-]{8,80}$/.test(bing)&&!out.includes('msvalidate.01'))out=out.replace(/<head>/i,'<head><meta name="msvalidate.01" content="'+bing+'">');
 if(out.includes('<div class="footer-links">')&&!out.includes('vetassistance.org'))out=out.replace('<div class="footer-links">','<div class="footer-links">'+PARTNERS);
 return out;
}

function bingSiteAuth(env=process.env){
 const code=(env.BING_SITE_VERIFICATION||'').trim();
 return /^[A-Za-z0-9_-]{8,80}$/.test(code)?'<?xml version="1.0"?>\n<users><user>'+code+'</user></users>':'';
}

function sitemapUrls(xml){return [...String(xml).matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]).filter(u=>u.startsWith('https://'));}

// Tell Bing and other IndexNow engines about every page in the sitemap. Never throws.
async function submitIndexNow(baseUrl,xml,fetchImpl=globalThis.fetch){
 const urls=sitemapUrls(xml);
 if(!urls.length||typeof fetchImpl!=='function')return {ok:false,status:0,count:0};
 const host=new URL(baseUrl).host;
 try{
  const r=await fetchImpl('https://api.indexnow.org/indexnow',{method:'POST',headers:{'Content-Type':'application/json; charset=utf-8'},
   body:JSON.stringify({host,key:INDEXNOW_KEY,keyLocation:baseUrl+'/'+INDEXNOW_KEY+'.txt',urlList:urls})});
  return {ok:r.status===200||r.status===202,status:r.status,count:urls.length};
 }catch{return {ok:false,status:0,count:urls.length};}
}

module.exports={INDEXNOW_KEY,decorate,structuredData,bingSiteAuth,sitemapUrls,submitIndexNow};

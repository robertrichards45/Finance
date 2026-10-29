'use strict';
const dns=require('node:dns/promises'),https=require('node:https'),net=require('node:net');
const {fail}=require('./security');
const HOSTS=new Set(['www.usajobs.gov','usajobs.gov','job-boards.greenhouse.io','boards.greenhouse.io','jobs.lever.co']);
function allowed(value){let u;try{u=new URL(value);}catch{fail(400,'Enter a valid HTTPS announcement URL.');}if(u.protocol!=='https:'||u.username||u.password||u.port&&u.port!=='443'||!(HOSTS.has(u.hostname)||u.hostname.endsWith('.myworkdayjobs.com'))||u.hash)fail(400,'Automatic import supports USAJOBS, Greenhouse, Lever, and Workday HTTPS job pages. Paste other announcements instead.');return u;}
function publicAddress(ip){
 const type=net.isIP(ip);if(!type)return false;const blocked=new net.BlockList();
 if(type===4){for(const [range,bits]of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.168.0.0',16],['192.0.2.0',24],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]])blocked.addSubnet(range,bits,'ipv4');return !blocked.check(ip,'ipv4');}
 const global=new net.BlockList();global.addSubnet('2000::',3,'ipv6');for(const [range,bits]of [['2001:db8::',32],['2001::',32],['2002::',16]])blocked.addSubnet(range,bits,'ipv6');return global.check(ip,'ipv6')&&!blocked.check(ip,'ipv6');
}
async function read(u,address){return new Promise((resolve,reject)=>{
 const req=https.get(u,{lookup:(_host,_options,callback)=>callback(null,address.address,address.family),headers:{'User-Agent':'CareerLaunchAI-JobImport/1.0','Accept':'text/html,text/plain','Accept-Encoding':'identity'},timeout:10000},res=>{let size=0,parts=[];res.on('data',chunk=>{size+=chunk.length;if(size>512000){req.destroy();reject(Error('Announcement is too large'));}else parts.push(chunk);});res.on('error',reject);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(parts).toString('utf8')}));});req.on('timeout',()=>req.destroy(Error('Announcement timed out')));req.on('error',reject);
 });}
function plain(html){return html.replace(/<(script|style|noscript|nav|header|footer)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<!--[^]*?-->/g,' ').replace(/<\/(?:p|li|div|section|h[1-6])\s*>/gi,'\n').replace(/<[^>]*>/g,' ').replace(/&(?:nbsp|amp|lt|gt|quot|apos);/g,x=>({'&nbsp;':' ','&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"}[x])).replace(/[ \t]+/g,' ').replace(/\n\s*\n/g,'\n').trim();}
async function importJob(value,{lookup=dns.lookup,request=read}={}){
 let url=allowed(value);for(let hop=0;hop<4;hop++){
  const addresses=await lookup(url.hostname,{all:true,verbatim:true});if(!addresses.length||addresses.some(a=>!publicAddress(a.address)))fail(400,'This announcement address cannot be safely retrieved. Paste the announcement instead.');
  let response;try{response=await request(url,addresses[0]);}catch{fail(422,'The announcement could not be retrieved. Paste its text instead.');}
  if([301,302,303,307,308].includes(response.status)){url=allowed(new URL(response.headers.location,url).href);continue;}
  if(response.status!==200||!/^(text\/html|text\/plain)(?:;|$)/i.test(response.headers['content-type']||''))fail(422,'This source did not provide a readable job page. Paste the announcement instead.');
  const text=plain(response.body);if(text.length<80)fail(422,'This page requires interactive access or contains too little text. Paste the announcement instead.');
  return {text:text.slice(0,14000),sourceUrl:url.href,retrievedAt:new Date().toISOString(),truncated:text.length>14000,reviewRequired:true};
 }fail(422,'Too many redirects. Paste the announcement instead.');
}
module.exports={allowed,publicAddress,plain,importJob};

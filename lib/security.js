'use strict';
const crypto=require('node:crypto');
const random=()=>crypto.randomBytes(32).toString('base64url');
const hash=(s,secret)=>crypto.createHmac('sha256',secret).update(s).digest('hex');
function same(a,b){if(typeof a!=='string'||typeof b!=='string')return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&crypto.timingSafeEqual(x,y);}
function cookie(req){const value=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('cl_session='));return value?value.slice(11):'';}
function normalizeEmail(email){if(typeof email!=='string'||email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email))throw Object.assign(Error('Enter a valid email address.'),{status:400});return email.trim().toLowerCase();}
function fail(status,message){throw Object.assign(Error(message),{status});}
async function jsonBody(req,limit=90000){
 if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))fail(415,'Use application/json.');
 if(Number(req.headers['content-length'])>limit)fail(413,'Request is too large.');
 const chunks=[];let n=0;for await(const chunk of req){n+=chunk.length;if(n>limit)fail(413,'Request is too large.');chunks.push(chunk);}
 try{const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!value||typeof value!=='object'||Array.isArray(value))throw Error();return value;}catch{fail(400,'Invalid JSON request.');}
}
module.exports={random,hash,same,cookie,normalizeEmail,fail,jsonBody};

'use strict';
const crypto=require('node:crypto');
function issueToken({orderId,secret,expiresAt}){
 if(typeof orderId!=='string'||!/^cl_[a-f0-9]{32}$/.test(orderId)||typeof secret!=='string'||Buffer.byteLength(secret)<32||!Number.isSafeInteger(expiresAt))throw Error('Invalid token configuration');
 const payload=Buffer.from(JSON.stringify({orderId,expiresAt})).toString('base64url');
 const mac=crypto.createHmac('sha256',secret).update(payload).digest('base64url');
 return payload+'.'+mac;
}
function verifyToken(token,{secret,now=Date.now()}={}){
 if(typeof token!=='string'||token.length>1024||typeof secret!=='string'||Buffer.byteLength(secret)<32)return null;
 const parts=token.split('.');if(parts.length!==2)return null;
 const [payload,signature]=parts;
 if(!/^[A-Za-z0-9_-]+$/.test(payload)||!/^[A-Za-z0-9_-]+$/.test(signature))return null;
 const expected=crypto.createHmac('sha256',secret).update(payload).digest();
 let actual;try{actual=Buffer.from(signature,'base64url')}catch{return null}
 if(actual.length!==expected.length||!crypto.timingSafeEqual(actual,expected))return null;
 try{const data=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));if(!/^cl_[a-f0-9]{32}$/.test(data.orderId)||!Number.isSafeInteger(data.expiresAt)||data.expiresAt<=now)return null;return data}catch{return null}
}
module.exports={issueToken,verifyToken};

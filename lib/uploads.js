'use strict';
const net=require('node:net');
const {execFile}=require('node:child_process');
const path=require('node:path');
const {fail}=require('./security');
const MAX_BYTES=2*1024*1024;
function clamScan(buffer,{clamavHost,clamavPort=3310}){
 if(!clamavHost)return Promise.reject(Error('Document scanning is not configured. Use plain text.'));
 return new Promise((resolve,reject)=>{
  const socket=net.createConnection({host:clamavHost,port:clamavPort});let reply='';
  const stop=e=>{socket.destroy();reject(e);};socket.setTimeout(10000,()=>stop(Error('Scanner timed out.')));
  socket.on('error',()=>stop(Error('Scanner unavailable.')));
  socket.on('connect',()=>{socket.write(Buffer.from('zINSTREAM\0'));for(let off=0;off<buffer.length;off+=65536){const part=buffer.subarray(off,off+65536),len=Buffer.alloc(4);len.writeUInt32BE(part.length);socket.write(len);socket.write(part);}socket.write(Buffer.alloc(4));});
  socket.on('data',chunk=>{reply+=chunk.toString();if(reply.length>1024)stop(Error('Invalid scanner response.'));if(reply.includes('\0')){socket.end();if(/^stream: OK\x00$/.test(reply))resolve();else stop(Error('Document rejected by malware scanner.'));}});
  socket.on('end',()=>{if(!reply.includes('\0'))reject(Error('Incomplete scanner response.'));});
 });
}
async function extractUpload(input,config,{scan=clamScan}={}){
 if(typeof input.filename!=='string'||input.filename.length>150||typeof input.data!=='string'||input.data.length>Math.ceil(MAX_BYTES/3)*4||!/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(input.data))fail(400,'Invalid file. Maximum file size is 2 MB.');
 const bytes=Buffer.from(input.data,'base64');if(!bytes.length||bytes.length>MAX_BYTES)fail(413,'Maximum file size is 2 MB.');
 const ext=path.extname(input.filename).toLowerCase();let text;
 if(ext==='.txt'||ext==='.md'){
  text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  if(text.includes('\0')||/[\u0000-\u0008\u000e-\u001f]/.test(text))fail(400,'Upload a UTF-8 plain text document.');
 }else if(ext==='.docx'||ext==='.pdf'){
  if(!config.clamavHost)fail(503,'Word/PDF scanning is not enabled. Upload a .txt resume or paste its contents.');
  if(ext==='.docx'&&bytes.subarray(0,2).toString()!=='PK'||ext==='.pdf'&&bytes.subarray(0,5).toString()!=='%PDF-')fail(400,'File contents do not match the extension.');
  await scan(bytes,config);
  text=await new Promise((resolve,reject)=>{const proc=execFile(process.execPath,['--max-old-space-size=128',path.join(__dirname,'parse-upload.js'),ext],{timeout:10000,maxBuffer:100000,encoding:'utf8'},(err,stdout)=>err?reject(Error('This document could not be safely read. Export it as plain text.')):resolve(stdout));proc.stdin.end(bytes);});
 }else fail(415,'Use TXT, DOCX, or PDF.');
 text=text.trim();if(text.length<20||text.length>18000)fail(400,'The extracted text must be between 20 and 18,000 characters.');
 return {text,characters:text.length,originalStored:false};
}
module.exports={MAX_BYTES,clamScan,extractUpload};

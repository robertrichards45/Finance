'use strict';
// Disposable process: bounded input, memory, execution time, ZIP expansion, and extracted text.
async function parse(buffer,ext){
 if(ext==='.docx'){
  const zip=await require('jszip').loadAsync(buffer);const entries=Object.values(zip.files);
  if(entries.length>150||entries.reduce((n,f)=>n+(f._data?.uncompressedSize||0),0)>8*1024*1024)throw Error('Archive limit');
  if(entries.some(f=>/vbaProject|embeddings|activeX|\.bin$|\.exe$/i.test(f.name)))throw Error('Active content');
  for(const f of entries.filter(f=>f.name.endsWith('.rels')))if(/TargetMode\s*=\s*["']External/i.test(await f.async('string')))throw Error('External content');
  const doc=zip.file('word/document.xml');if(!doc)throw Error('Not a Word document');const xml=await doc.async('string');if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('XML entities');
  const {DOMParser}=require('@xmldom/xmldom');const dom=new DOMParser({onError:()=>{throw Error('Invalid XML');}}).parseFromString(xml,'text/xml');
  const paras=Array.from(dom.getElementsByTagName('w:p'));return paras.map(p=>Array.from(p.getElementsByTagName('w:t')).map(t=>t.textContent).join('')).join('\n');
 }
 if(ext==='.pdf'){
  if(/\/(JavaScript|JS|Launch|EmbeddedFile|RichMedia)\b/.test(buffer.toString('latin1')))throw Error('Active PDF');
  const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');const task=getDocument({data:new Uint8Array(buffer),isEvalSupported:false,useSystemFonts:false,disableFontFace:true}),pdf=await task.promise;
  try{if(pdf.numPages>12)throw Error('Page limit');let text='';for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i);text+=(await page.getTextContent()).items.map(x=>x.str||'').join(' ')+'\n';if(text.length>18000)throw Error('Text limit');}return text;}finally{await task.destroy();}
 }throw Error('Unsupported');
}
if(require.main===module){let n=0,parts=[];process.stdin.on('data',b=>{n+=b.length;if(n>2*1024*1024)process.exit(1);parts.push(b);});process.stdin.on('end',()=>parse(Buffer.concat(parts),process.argv[2]).then(s=>process.stdout.write(s),()=>process.exit(1)));}
module.exports={parse};

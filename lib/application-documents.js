'use strict';
const {validateApplicationDraft}=require('./application-ai');
function content(input,raw,kind){
 const draft=validateApplicationDraft(raw,input);
 if(kind==='cover')return [{text:input.name,style:'name'},{text:input.contact,style:'contact'},{text:'Re: '+input.role,style:'heading'},...draft.coverLetter.split(/\n+/).filter(Boolean).map(text=>({text})),{text:'Sincerely,\n'+input.name}];
 const blocks=[{text:input.name,style:'name'},{text:input.contact,style:'contact'},{text:input.role,style:'heading'},{text:'PROFESSIONAL SUMMARY',style:'heading'},{text:draft.summary},{text:'CORE SKILLS',style:'heading'},{text:draft.skills.join(' · ')}];
 if(input.jobs.length)blocks.push({text:'PROFESSIONAL EXPERIENCE',style:'heading'});
 for(const job of input.jobs){blocks.push({text:job.title+' | '+job.employer,style:'job'},{text:[job.location,job.start+' – '+job.end,job.hours?job.hours+' hours/week':''].filter(Boolean).join(' | '),style:'contact'});
  for(const b of draft.experience.find(e=>e.jobId===job.id)?.bullets||[])blocks.push({text:b.text,bullet:true});}
 if(input.education)blocks.push({text:'EDUCATION & CREDENTIALS',style:'heading'},{text:input.education});return blocks;
}
async function pdfDocument(blocks,kind,{fontSize=10.5}={}){
 const PDFDocument=require('pdfkit');
 return new Promise((resolve,reject)=>{const doc=new PDFDocument({size:'LETTER',margins:{top:40,bottom:40,left:42,right:42},bufferPages:true,info:{Title:kind==='resume'?'Resume':'Cover Letter',Author:'CareerLaunch AI'}});const chunks=[];doc.on('data',b=>chunks.push(b));doc.on('error',reject);let pages=1;doc.on('pageAdded',()=>pages++);
  doc.on('end',()=>resolve({bytes:Buffer.concat(chunks),pages}));
  for(const b of blocks){if(!b.text)continue;const heading=b.style==='heading',name=b.style==='name',bold=heading||name||b.style==='job';
   doc.font(bold?'Helvetica-Bold':'Helvetica').fontSize(name?20:heading?11.5:fontSize);
   if(heading&&doc.y>doc.page.height-100)doc.addPage();
   const options={paragraphGap:heading?5:6,lineGap:1,width:528,indent:b.bullet?8:0};doc.text((b.bullet?'• ':'')+b.text,options);
  }doc.end();});
}
async function docxDocument(blocks,kind,input={}){
 const {Document,Paragraph,TextRun,Packer}=require('docx');
 const theme=/^#[0-9a-fA-F]{6}$/.test(input.accentColor||'')?input.accentColor.slice(1):'234E83';const design=input.template||'classic';const modern=['modern','bold','sidebar'].includes(design);const font=design==='executive'?'Georgia':design==='minimal'?'Calibri':'Arial';
 return Packer.toBuffer(new Document({creator:'CareerLaunch AI',title:kind==='resume'?'Resume':'Cover Letter',styles:{default:{document:{run:{font,size:21},paragraph:{spacing:{after:100,line:252}}}}},sections:[{properties:{page:{size:{width:12240,height:15840},margin:{top:800,bottom:800,left:840,right:840}}},children:blocks.filter(b=>b.text).map(b=>new Paragraph({keepNext:['name','heading','job'].includes(b.style),bullet:b.bullet?{level:0}:undefined,spacing:{before:b.style==='heading'?110:0,after:100},children:b.text.split('\n').flatMap((s,i)=>[new TextRun({text:s,break:i?1:0,bold:['name','heading','job'].includes(b.style),color:b.style==='name'||b.style==='heading'?theme:'253047',font,size:b.style==='name'?(modern?44:40):b.style==='heading'?(design==='executive'?25:23):21})])}))}]}));
}
async function renderWord(bytes,kind){
 const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
 const {promisify}=require('node:util'),exec=promisify(require('node:child_process').execFile);
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'cl-render-'));
 try{const filename=path.join(directory,kind+'.docx');await fs.writeFile(filename,bytes,{mode:0o600});
  await exec('soffice',['-env:UserInstallation=file://'+path.join(directory,'profile'),'--headless','--convert-to','pdf','--outdir',directory,filename],{timeout:30000,maxBuffer:100000});
  const pdf=path.join(directory,kind+'.pdf'),[info,text]=await Promise.all([exec('pdfinfo',[pdf],{timeout:5000}),exec('pdftotext',[pdf,'-'],{timeout:5000,maxBuffer:100000})]);
  const pages=Number(info.stdout.match(/^Pages:\s+(\d+)/m)?.[1]);if(!pages||text.stdout.trim().length<30)throw Error('Rendered document is empty');
  return {bytes:await fs.readFile(pdf),pages};
 }finally{await fs.rm(directory,{recursive:true,force:true});}
}
async function generatePackage(input,draft,{render=renderWord}={}){
 const files={},quality={};
 for(const kind of ['resume','cover']){const blocks=content(input,draft,kind),word=await docxDocument(blocks,kind,input),pdf=await render(word,kind);if(pdf.pages>(kind==='resume'?2:1))throw Error('Document exceeds '+(kind==='resume'?'two pages':'one page')+'. Shorten the draft before approval.');
  files[kind+'.pdf']=pdf.bytes;files[kind+'.docx']=word;quality[kind+'Pages']=pdf.pages;
  if(files[kind+'.docx'].subarray(0,2).toString()!=='PK'||pdf.bytes.subarray(0,5).toString()!=='%PDF-')throw Error('Document validation failed');
 }return {files,quality};
}
module.exports={content,pdfDocument,docxDocument,renderWord,generatePackage};

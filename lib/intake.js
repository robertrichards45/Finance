'use strict';
const {fail}=require('./security');
const TYPES=['private','federal','executive','entry-level','career-change'];
const TEMPLATES=['classic','modern','executive','sidebar','minimal','bold'];
const SECTIONS=['summary','skills','experience','education'];
function text(value,label,max,min=0){if(typeof value!=='string'||value.trim().length<min||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))fail(400,'Check '+label+'.');return value.trim();}
function validateIntake(x){
 if(!TYPES.includes(x.type))fail(400,'Choose a resume type.');
 if(x.template!==undefined&&!TEMPLATES.includes(x.template))fail(400,'Choose an available resume design.');
 if(x.accentColor!==undefined&&!/^#[0-9a-fA-F]{6}$/.test(x.accentColor))fail(400,'Choose a valid accent color.');
 if(x.type==='federal'&&['sidebar','bold'].includes(x.template))fail(400,'Choose a single-column federal resume design.');
 if(x.designFont!==undefined&&!['Arial','Calibri','Georgia','Aptos'].includes(x.designFont))fail(400,'Choose a supported document font.');
 if(x.designSize!==undefined&&!['10','10.5','11','12'].includes(String(x.designSize)))fail(400,'Choose a supported text size.');
 if(x.designSpacing!==undefined&&!['compact','normal','relaxed'].includes(x.designSpacing))fail(400,'Choose a supported line spacing.');
 if(x.sectionOrder!==undefined&&(!Array.isArray(x.sectionOrder)||x.sectionOrder.length!==SECTIONS.length||new Set(x.sectionOrder).size!==SECTIONS.length||!x.sectionOrder.every(v=>SECTIONS.includes(v))))fail(400,'Choose a valid résumé section order.');
 if(x.consent!==true)fail(400,'Consent is required before processing.');
 if(!Array.isArray(x.jobs)||x.jobs.length>8)fail(400,'Add up to eight positions.');
 const jobs=x.jobs.map((j,i)=>({id:'job'+i,employer:text(j.employer,'employer',120,2),title:text(j.title,'job title',120,2),
 location:text(j.location||'','location',100),start:text(j.start,'start date',7,7),end:text(j.end,'end date',7,1),
 hours:text(String(j.hours||''),'hours per week',5,x.type==='federal'?1:0),facts:text(j.facts,'duties and accomplishments',4000,20)}));
 for(const j of jobs){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(j.start)||!(/^(\d{4}-(0[1-9]|1[0-2])|Present)$/.test(j.end)))fail(400,'Use YYYY-MM dates or Present.');if(j.end!=='Present'&&j.end<j.start)fail(400,'End dates must follow start dates.');if(j.hours&&(!/^\d{1,2}(\.\d)?$/.test(j.hours)||Number(j.hours)>80||Number(j.hours)<=0))fail(400,'Check hours per week.');}
 const data={type:x.type,template:x.template||'classic',accentColor:x.accentColor||'#234e83',designFont:x.designFont||'Arial',designSize:String(x.designSize||'10.5'),designSpacing:x.designSpacing||'normal',sectionOrder:x.sectionOrder||[...SECTIONS],name:text(x.name,'name',100,2),contact:text(x.contact||'','contact line',240),role:text(x.role,'target role',100,3),
 skills:text(x.skills,'skills',1600,10),education:text(x.education||'','education',3000),jobPosting:text(x.jobPosting,'job description',14000,30),
 jobUrl:text(x.jobUrl||'','job URL',500),instructions:text(x.instructions||'','formatting preferences',1000),resumeText:text(x.resumeText||'','uploaded text',18000),jobs,consent:true};
 if(data.jobUrl&&!/^https:\/\//.test(data.jobUrl))fail(400,'Use an HTTPS job URL and paste the job requirements.');
 if(!jobs.length&&data.resumeText.length<50&&data.education.length<30)fail(400,'Add experience, an existing resume, or relevant education.');
 if(data.type==='federal'&&!jobs.length)fail(400,'Federal resumes require structured employment dates and hours.');
 if(/\b\d{3}-\d{2}-\d{4}\b/.test(JSON.stringify(data)))fail(400,'Remove Social Security numbers before continuing.');
 return data;
}
module.exports={TYPES,TEMPLATES,SECTIONS,text,validateIntake};

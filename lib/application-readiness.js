'use strict';
// Free, deterministic guidance. This never infers qualifications from a posting.
const {validateIntake}=require('./intake');
function applicationReadiness(input){
 const questions=[],suggestions=[];
 if((input.name||'').trim().length<2)questions.push('What name should appear on your documents?');
 if((input.role||'').trim().length<3)questions.push('What exact job title are you applying for?');
 if((input.jobPosting||'').trim().length<30)questions.push('Paste the job announcement or describe the employer’s actual requirements so the writing can target this opportunity.');
 if((input.skills||'').trim().length<10)questions.push('Which relevant tools, skills or equipment have you actually used?');
 for(const [i,job] of (input.jobs||[]).entries()){
  const label=job.title||'position '+(i+1);
  if((job.employer||'').length<2||(job.title||'').length<2)questions.push('Confirm the employer and your actual job title for position '+(i+1)+'.');
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(job.start||'')||!(/^(\d{4}-(0[1-9]|1[0-2])|Present)$/.test(job.end||'')))questions.push('Confirm the start and end month/year for '+label+'; use Present if you still work there.');
  else if(job.end!=='Present'&&job.end<job.start)questions.push('Correct the employment dates for '+label+': the end precedes the start.');
  if(input.type==='federal'&&!job.hours)questions.push('How many hours per week did you work as '+label+'?');
  const facts=(job.facts||'').trim();
  if(facts.length<20)questions.push('What work did you actually perform as '+label+'? Describe your actions and tools; include results only when known.');
  else if(facts.split(/\s+/).length<25)suggestions.push('For '+label+', add a concrete example: what you did, which tool or work product was involved, and any outcome you can verify. Numbers are optional.');
 }
 if(!(input.jobs||[]).length&&(input.resumeText||'').length<50&&(input.education||'').length<30)questions.push('Add actual work experience, an existing résumé, or relevant coursework and projects.');
 let ready=true;try{validateIntake(input);}catch(error){ready=false;if(!questions.length)questions.push(error.message);}
 return {ready,questions,suggestions};
}
module.exports={applicationReadiness};

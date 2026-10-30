'use strict';
// Likely interview questions for one job posting, with answer outlines built only from the applicant's own facts.
const {requestJSON,assertNumbers}=require('./application-ai');
const SYSTEM=`You prepare a job seeker for an interview for ONE specific job posting.
Rules:
- Write exactly 10 questions this employer is likely to ask, based on the posting's duties and requirements. Mix: 3 about experience with key duties, 3 behavioral ("Tell me about a time..."), 2 about skills or tools in the posting, 1 about why this job, 1 about a gap or concern the posting might raise for this applicant.
- For each question give an answer outline of 2-4 short bullet points using ONLY facts in the applicant's input and résumé draft. Never invent employers, numbers, tools, results or credentials.
- If the applicant has no matching fact for a question, the outline must say what kind of real example to think of, without inventing one.
- For behavioral questions, outline in Situation / Action / Result order.
- Plain language, no buzzwords, no emoji. If the person served in the military, use civilian wording.`;
const spec={type:'object',additionalProperties:false,required:['questions'],properties:{questions:{type:'array',items:{type:'object',additionalProperties:false,required:['question','why','outline'],properties:{question:{type:'string'},why:{type:'string'},outline:{type:'array',items:{type:'string'}}}}}}};
const clean=(v,max)=>String(v||'').replace(/[\u0000-\u0008\u000b-\u001f]/g,'').trim().slice(0,max);
async function generateInterview(input,draft,options={}){
 const {name,contact,...facts}=input;
 const result=await requestJSON(SYSTEM,{jobPosting:facts.jobPosting,facts,draft:{summary:draft.summary,skills:draft.skills,experience:draft.experience}},spec,'interview_practice',options);
 const questions=(result.value.questions||[]).slice(0,12).map(q=>({question:clean(q.question,300),why:clean(q.why,300),outline:(q.outline||[]).slice(0,5).map(x=>clean(x,300)).filter(Boolean)})).filter(q=>q.question&&q.outline.length);
 if(questions.length<5)throw Error('AI output was incomplete or refused');
 assertNumbers(questions.map(q=>q.outline.join(' ')).join(' '),JSON.stringify({facts,draft}));
 return {value:{questions},usage:result.usage};
}
module.exports={generateInterview,SYSTEM};

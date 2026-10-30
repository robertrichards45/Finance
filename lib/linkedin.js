'use strict';
// LinkedIn headline and About section written only from the applicant's verified facts and approved draft.
const {requestJSON,assertNumbers}=require('./application-ai');
const SYSTEM=`You write LinkedIn profile text for a job seeker from their verified facts and their résumé draft.
Rules:
- Use only facts present in the input. Never add employers, titles, numbers, dates, credentials, clearances or skills that are not there.
- Headline: at most 220 characters, plain words, the role they want plus 2-3 strengths separated by " | ". No emoji.
- About: 3 short paragraphs, first person, 150-300 words total, concrete and specific. No buzzwords like "results-driven", "passionate", "synergy". No emoji.
- Skills: up to 10 skills taken from the input.
- If the person served in the military, translate military terms into civilian language.`;
const spec={type:'object',additionalProperties:false,required:['headline','about','skills'],properties:{headline:{type:'string'},about:{type:'string'},skills:{type:'array',items:{type:'string'}}}};
function clean(v,max){return String(v||'').replace(/[\u0000-\u0008\u000b-\u001f]/g,'').trim().slice(0,max);}
async function generateLinkedIn(input,draft,options={}){
 const {name,contact,...facts}=input;
 const result=await requestJSON(SYSTEM,{facts,draft:{summary:draft.summary,skills:draft.skills,experience:draft.experience}},spec,'linkedin_profile',options);
 const out={headline:clean(result.value.headline,220),about:clean(result.value.about,2600),skills:(result.value.skills||[]).map(s=>clean(s,60)).filter(Boolean).slice(0,10)};
 if(!out.headline||!out.about)throw Error('AI output was incomplete or refused');
 const source=JSON.stringify({facts,draft});assertNumbers(out.headline+' '+out.about,source);
 return {value:out,usage:result.usage};
}
module.exports={generateLinkedIn,SYSTEM};

'use strict';
const {validateOrder}=require('./order-validation');
function makeOutline(input){
 const result=validateOrder(input);
 if(!result.valid)return {ok:false,errors:result.errors};
 const d=result.data;
 const federal=d.package==='federal';
 const sections=[
 'CAREERLAUNCH AI — APPLICATION DRAFT OUTLINE',
 'Target role: '+d.role,
 'Application: '+(federal?'Federal':'Private sector'),
 '',
 'PROFESSIONAL SUMMARY',
 '[Summarize verified experience that matches the posting. Do not invent accomplishments.]',
 '',
 'CORE SKILLS',
 d.skills,
 '',
 'PROFESSIONAL EXPERIENCE',
 d.experience,
 federal?'[For each position verify employer, location, title, start/end dates, hours per week, duties, and measurable accomplishments.]':'[For each position verify employer, title, dates, results and accomplishments.]',
 '',
 'EDUCATION AND CERTIFICATIONS',
 d.education||'[Provide verified education and certifications.]',
 '',
 'TARGET JOB REQUIREMENTS',
 d.jobPosting,
 '',
 'FACT CHECK BEFORE SUBMITTING',
 '[ ] Every employer, date, credential, clearance and accomplishment is accurate',
 '[ ] Job-specific requirements are addressed using actual experience',
 '[ ] Formatting and length match the employer or agency instructions',
 '[ ] No sensitive information is included unnecessarily',
 '',
 'COVER LETTER OUTLINE',
 'Dear Hiring Manager,',
 '[Opening: identify the role and a genuine reason for interest.]',
 '[Body: connect verified examples to the key job requirements.]',
 '[Closing: express interest without guaranteeing qualifications.]',
 'Sincerely,',
 '[Applicant name]'
 ];
 return {ok:true,text:sections.join('\n')};
}
module.exports={makeOutline};

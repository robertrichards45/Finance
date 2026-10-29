'use strict';
// Explicit live integration check. Run only in a trusted server environment.
// Uses fictional applicant data; never prints credentials or generated content.
const {configuration}=require('../lib/config');
const {validateIntake}=require('../lib/intake');
const {generateApplication}=require('../lib/application-ai');
const {generatePackage}=require('../lib/application-documents');
async function main(){
 const config=configuration();
 if(!config.apiKey)throw Error('AI key unavailable');
 console.log('CAREERLAUNCH_AI_SMOKE_START '+JSON.stringify({model:config.model}));
 const input=validateIntake({
  type:'private',name:'Alex Example',contact:'',role:'Operations Coordinator',
  skills:'Scheduling, operational reporting, training coordination',education:'',
  jobPosting:'Coordinate internal training schedules and prepare operational reports for team leadership.',
  consent:true,jobs:[{employer:'Example Company',title:'Coordinator',location:'Example City',
   start:'2021-01',end:'Present',hours:'40',
   facts:'Coordinated recurring training schedules and prepared operational reports for internal leadership.'}]
 });
 const result=await generateApplication(input,{apiKey:config.apiKey,model:config.model});
 const bundle=await generatePackage(input,result.draft);
 for(const name of ['resume.docx','resume.pdf','cover.docx','cover.pdf'])
  if(!bundle.files[name]||bundle.files[name].length<500)throw Error('Missing document output');
 console.log('CAREERLAUNCH_AI_SMOKE_PASS '+JSON.stringify({
  model:config.model,documents:4,quality:bundle.quality,
  remainingBlockers:config.blockers,checkoutEnabled:false
 }));
}
if(require.main===module)main().catch(()=>{
 console.error('CAREERLAUNCH_AI_SMOKE_FAIL: provider request or document validation failed; no secrets logged.');
 process.exitCode=1;
});
module.exports={main};

'use strict';
// Explicit live-provider acceptance probe using ONLY the synthetic facts below.
// Never reads customer records and never prints credentials or environment values.
const {configuration}=require('../lib/config');
const {validateIntake}=require('../lib/intake');
const {generateApplication}=require('../lib/application-ai');
const {generatePackage}=require('../lib/application-documents');
async function main(){
 const config=configuration();
 const input=validateIntake({type:'federal',name:'Alex Example',contact:'alex@example.test | Fictional City',role:'Program Analyst',skills:'Excel, operational reporting, training schedules, records review, process documentation',education:'Bachelor of Arts in Business Administration, Example University, 2019',consent:true,
  jobPosting:'Program Analyst: prepare weekly operational reports for management; review training and administrative records for completeness; coordinate training schedules; document procedures and follow up on missing information. Explain relevant specialized experience with examples. Include employment dates and hours per week. SQL experience is preferred. Resume maximum two pages.',
  jobs:[{employer:'Example Services',title:'Operations Coordinator',location:'Fictional City',start:'2021-01',end:'Present',hours:'40',facts:'Prepared weekly operational reports in Excel for department leadership, combining schedule updates and open action items. Coordinated recurring training schedules for 12 staff and checked proposed dates against required attendance. Reviewed training records for missing completion dates and followed up with staff to obtain corrected information. Maintained written instructions for recurring reporting tasks and updated them when the reporting process changed. Created a shared action-item tracker in Excel so leadership could see which follow-ups remained open.'},
   {employer:'Example Community Office',title:'Administrative Assistant',location:'Fictional City',start:'2019-06',end:'2020-12',hours:'40',facts:'Maintained office schedules and prepared meeting agendas and background materials. Organized administrative files and updated an Excel register of incoming requests. Checked requests for missing supporting documents before routing them to the coordinator. Assisted senior staff with compiling monthly activity summaries. Responded to routine information requests using approved reference materials.'}]});
 console.log('CAREERLAUNCH_WRITING_START: synthetic federal application; writer, editorial review and four document renders.');
 const result=await generateApplication(input,{apiKey:config.apiKey,model:config.model});
 const bundle=await generatePackage(input,result.draft);
 if(result.editorial.passed!==true||Object.keys(bundle.files).length!==4)throw Error('Acceptance failed');
 // All content is derived from the hard-coded fictional fixture, never customer input.
 console.log('CAREERLAUNCH_WRITING_SYNTHETIC '+JSON.stringify({draft:result.draft,editorial:result.editorial}));
 console.log('CAREERLAUNCH_WRITING_PASS '+JSON.stringify({quality:bundle.quality,usage:result.usage,repair:result.editorialRepair,checkoutEnabled:false}));
}
if(require.main===module)main().catch(error=>{console.error('CAREERLAUNCH_WRITING_FAIL '+(error.code==='EDITORIAL_REVIEW_FAILED'?'EDITORIAL_REVIEW_FAILED':'PROVIDER_OR_DOCUMENT_CHECK'));process.exitCode=1;});
module.exports={main};

'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {validateIntake}=require('../lib/intake');
const {applicationReadiness}=require('../lib/application-readiness');
function facts(){return validateIntake({type:'federal',name:'Test Applicant',role:'Office Assistant',skills:'Excel, filing',education:'',jobPosting:'Maintain filing systems and prepare office reports.',consent:true,jobs:[{employer:'Example Agency',title:'Office Clerk',start:'2023-01',end:'Present',hours:'40',facts:'Maintained filing systems in Excel.'}]});}
test('thin but valid experience gets useful optional questions without demanding numbers',()=>{const r=applicationReadiness(facts());assert.equal(r.ready,true);assert.equal(r.questions.length,0);assert.match(r.suggestions[0],/Numbers are optional/);});
test('missing facts are exposed before spending a generation request',()=>{const x=facts();x.jobs[0].hours='';x.jobs[0].facts='';x.jobPosting='';const r=applicationReadiness(x);assert.equal(r.ready,false);assert.match(r.questions.join(' '),/hours per week/);assert.match(r.questions.join(' '),/announcement/);assert.match(r.questions.join(' '),/actually perform/);});
test('invalid dates and education-only backgrounds get accurate guidance',()=>{const x=facts();x.jobs[0].end='2020-01';assert.match(applicationReadiness(x).questions.join(' '),/end precedes/);const e={...facts(),type:'entry-level',jobs:[],education:'Completed a course project organizing a filing system in Excel.'};assert.equal(applicationReadiness(e).ready,true);});

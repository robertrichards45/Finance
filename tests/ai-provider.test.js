'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {generateDraft}=require('../lib/ai-provider');
const input={package:'private',role:'Project Manager',skills:'Project delivery and planning',experience:'Managed project schedules and status reporting for internal teams.',jobPosting:'Manage timelines and reporting'};
test('missing key does not make network request',async()=>{let called=false;const r=await generateDraft(input,{apiKey:'',fetchImpl:()=>{called=true}});assert.equal(r.ok,false);assert.equal(called,false)});
test('provider returns validated draft',async()=>{const draft={summary:'Summary',skills:'Planning',experienceBullets:['Managed schedules'],coverLetter:'Dear Hiring Manager',verificationQuestions:['Confirm dates']};const r=await generateDraft(input,{apiKey:'test',fetchImpl:async()=>({ok:true,text:async()=>JSON.stringify({choices:[{message:{content:JSON.stringify(draft)}}]})})});assert.equal(r.ok,true);assert.equal(r.requiresCustomerReview,true)});
test('provider failure does not expose credentials',async()=>{const r=await generateDraft(input,{apiKey:'secret-token',fetchImpl:async()=>({ok:false,status:429})});assert.equal(r.ok,false);assert.doesNotMatch(JSON.stringify(r),/secret-token/)});

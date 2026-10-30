'use strict';
const test=require('node:test'),assert=require('node:assert/strict');const {generateInterview}=require('../lib/interview');
const input={name:'A',contact:'a@b.test',role:'Analyst',jobPosting:'Prepare weekly reports.',jobs:[{facts:'Prepared 12 weekly reports.'}]};const draft={summary:'Analyst',skills:[],experience:[]};
const fake=v=>async()=>({ok:true,text:async()=>JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(v)}}]})});
const q=n=>Array.from({length:n},(_,i)=>({question:'Q'+i,why:'w',outline:['Prepared 12 weekly reports.']}));
test('interview generator returns questions built from facts',async()=>{const r=await generateInterview(input,draft,{apiKey:'k',fetchImpl:fake({questions:q(10)})});assert.equal(r.value.questions.length,10);});
test('interview generator rejects invented numbers',async()=>{await assert.rejects(generateInterview(input,draft,{apiKey:'k',fetchImpl:fake({questions:[...q(9),{question:'Q',why:'w',outline:['Saved $40,000.']}]})}),/Unsupported numeric claim/);});

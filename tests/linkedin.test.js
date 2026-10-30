'use strict';
const test=require('node:test'),assert=require('node:assert/strict');const {generateLinkedIn}=require('../lib/linkedin');
const input={name:'A',contact:'a@b.test',role:'Analyst',skills:'Reporting',jobs:[{facts:'Prepared 12 weekly reports.'}]};const draft={summary:'Analyst',skills:['Reporting'],experience:[]};
const fake=value=>async()=>({ok:true,text:async()=>JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}]})});
test('LinkedIn generator keeps supported numbers',async()=>{const r=await generateLinkedIn(input,draft,{apiKey:'k',fetchImpl:fake({headline:'Analyst | Reporting',about:'I prepared 12 weekly reports.',skills:['Reporting']})});assert.equal(r.value.headline,'Analyst | Reporting');});
test('LinkedIn generator rejects invented numbers',async()=>{await assert.rejects(generateLinkedIn(input,draft,{apiKey:'k',fetchImpl:fake({headline:'Analyst',about:'I saved $2M.',skills:[]})}),/Unsupported numeric claim/);});

'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {generateDocx,generatePdf}=require('../lib/generate-documents');
const input={role:'Project Manager',draft:{summary:'Coordinated projects',skills:'Scheduling',experienceBullets:['Created status reports'],coverLetter:'Dear Hiring Manager,',verificationQuestions:['Confirm dates']}};
test('generates DOCX ZIP file',async()=>{const b=await generateDocx(input);assert.equal(b.subarray(0,2).toString(),'PK');assert.ok(b.length>1000)});
test('generates PDF file',async()=>{const b=await generatePdf(input);assert.equal(b.subarray(0,4).toString(),'%PDF');assert.ok(b.length>500)});
test('rejects invalid document data',async()=>assert.rejects(generateDocx({role:'x',draft:{}})));

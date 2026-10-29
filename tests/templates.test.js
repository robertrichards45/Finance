'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {validateIntake}=require('../lib/intake');
const {content}=require('../lib/application-documents');
const base={type:'private',name:'Example Applicant',contact:'example@example.com',role:'Project Manager',skills:'Project planning and training',education:'Sample education history and training',jobPosting:'Seeking an experienced project manager for delivery and training',instructions:'',resumeText:'',jobs:[],consent:true};
test('selected design and color survive validation',()=>{const r=validateIntake({...base,template:'executive',accentColor:'#6d49b6'});assert.equal(r.template,'executive');assert.equal(r.accentColor,'#6d49b6')});
test('reject unsupported designs and unsafe color strings',()=>{assert.throws(()=>validateIntake({...base,template:'unknown'}));assert.throws(()=>validateIntake({...base,accentColor:'red; background:url(bad)'}));});
test('federal documents reject sidebar designs',()=>{assert.throws(()=>validateIntake({...base,type:'federal',template:'sidebar'}));});

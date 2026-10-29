'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {makeOutline}=require('../lib/document-outline');
const sample={package:'federal',role:'Program Analyst',skills:'Data analysis and operational planning',experience:'Coordinated reporting and training for an operational team.',education:'Bachelor degree',jobPosting:'Prepare reports and assess operational performance'};
test('federal outline includes hours per week reminder',()=>{const r=makeOutline(sample);assert.equal(r.ok,true);assert.match(r.text,/hours per week/);assert.match(r.text,/COVER LETTER OUTLINE/);});
test('private sector outline omits federal specific fields',()=>{const r=makeOutline({...sample,package:'private'});assert.equal(r.ok,true);assert.doesNotMatch(r.text,/hours per week/);});
test('missing experience fails validation',()=>assert.equal(makeOutline({...sample,experience:''}).ok,false));

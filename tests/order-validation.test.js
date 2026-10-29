'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const {validateOrder}=require('../lib/order-validation');
test('rejects empty input',()=>assert.equal(validateOrder({}).valid,false));
test('rejects unsupported packages',()=>assert.equal(validateOrder({package:'free',role:'Manager',skills:'leadership and scheduling',experience:'Managed team operations for five years',jobPosting:'Manager role'}).valid,false));
test('accepts complete factual intake',()=>{const result=validateOrder({package:'federal',role:'Program Analyst',skills:'Planning, reporting, spreadsheets',experience:'Coordinated project milestones and trained new employees.',education:'BA',jobPosting:'Program Analyst duties'});assert.equal(result.valid,true)});
test('limits input sizes',()=>{const result=validateOrder({package:'private',role:'A'.repeat(500),skills:'B'.repeat(5000),experience:'C'.repeat(9000),jobPosting:'D'});assert.equal(result.data.role.length,100);assert.equal(result.data.skills.length,1200);assert.equal(result.data.experience.length,6000)});

'use strict';
const MAX={role:100,skills:1200,experience:6000,education:2000,jobPosting:8000};
const PACKAGES=new Set(['federal','private']);
function clean(value,max){return typeof value==='string'?value.trim().slice(0,max):''}
function validateOrder(input){
 const x=input&&typeof input==='object'?input:{};
 const data={package:clean(x.package,20),role:clean(x.role,MAX.role),skills:clean(x.skills,MAX.skills),experience:clean(x.experience,MAX.experience),education:clean(x.education,MAX.education),jobPosting:clean(x.jobPosting,MAX.jobPosting)};
 const errors=[];
 if(!PACKAGES.has(data.package))errors.push('Choose a valid package.');
 if(data.role.length<3)errors.push('Provide a target job title.');
 if(data.skills.length<10)errors.push('Provide relevant skills.');
 if(data.experience.length<20)errors.push('Provide factual employment experience.');
 if(!data.jobPosting)errors.push('Provide a target job description.');
 return {valid:errors.length===0,data,errors};
}
module.exports={validateOrder,MAX};

'use strict';
const REQUIRED=['workHistory','dates','education','credentials','achievements','targetJob'];
function reviewChecklist(answers){
 const a=answers&&typeof answers==='object'?answers:{};
 const missing=REQUIRED.filter(k=>a[k]!==true);
 return {approved:missing.length===0,missing};
}
function assertApproval(answers){
 const r=reviewChecklist(answers);
 if(!r.approved)throw Error('Customer verification incomplete');
 return true;
}
module.exports={REQUIRED,reviewChecklist,assertApproval};

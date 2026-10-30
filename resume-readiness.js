'use strict';
(() => {
  const common=[
    ['contact','My name and current contact information are correct.'],
    ['dates','Employment dates, job titles and employers are accurate.'],
    ['experience','My experience describes duties and results I can actually verify.'],
    ['relevance','The résumé shows experience relevant to the specific job.'],
    ['proofread','I checked spelling, clarity, layout and exported files.']
  ];
  const extra={
    private:[
      ['summary','The summary and skills reflect this specific role rather than generic claims.'],
      ['concise','I trimmed outdated, unrelated material and used clear section headings.'],
      ['format','The document is readable and uses a straightforward format.']
    ],
    federal:[
      ['hours','I included hours worked per week for relevant jobs.'],
      ['grade','I included federal series and grade where applicable.'],
      ['specialized','I explained the qualifying specialized experience using truthful details.'],
      ['instructions','I checked the announcement for required documents and instructions.'],
      ['pages','I checked the applicable two-page limit and readability.']
    ]
  };
  const container=document.getElementById('checklist-questions'),type=document.getElementById('checklist-type');
  if(!container||!type)return;
  function update(){
    const boxes=[...container.querySelectorAll('input[type=checkbox]')];
    const done=boxes.filter(b=>b.checked).length;
    document.getElementById('readiness-count').textContent=done+' of '+boxes.length+' items reviewed and confirmed.';
    document.getElementById('readiness-heading').textContent=done===boxes.length?'All checklist items confirmed':'Items to review before applying';
    document.getElementById('readiness-next').textContent=done===boxes.length?'Now read the specific job announcement again and verify every statement in your final document. This checklist does not guarantee qualification or selection.':'Review the unchecked items, correct the underlying résumé where needed, then return to confirm them.';
  }
  function render(){
    container.replaceChildren();
    for(const [id,label] of [...common,...extra[type.value]]){
      const row=document.createElement('label');row.className='readiness-option';
      const check=document.createElement('input');check.type='checkbox';check.value=id;
      const span=document.createElement('span');span.textContent=label;
      row.append(check,span);container.append(row);check.addEventListener('change',update);
    }
    update();
  }
  type.addEventListener('change',render);render();
})();
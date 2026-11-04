'use strict';
// Client-side only: requirements and evidence never leave the browser.
(function(){
  const byId=id=>document.getElementById(id);
  const field=id=>(byId(id)?.value||'').trim();
  function outline(){
    const lines=['FEDERAL SPECIALIZED EXPERIENCE — EVIDENCE WORKSHEET'];
    const title=field('fe-job');if(title)lines.push('Position: '+title);
    lines.push('Draft based only on your own stated experience. Verify against the vacancy announcement.','');
    let completed=0;
    for(let i=1;i<=3;i++){
      const requirement=field('fe-requirement-'+i),evidence=field('fe-evidence-'+i),result=field('fe-result-'+i);
      if(!requirement&&!evidence&&!result)continue;
      lines.push('REQUIREMENT '+i+': '+(requirement||'[Add exact requirement from announcement]'));
      lines.push('MY EVIDENCE: '+(evidence||'[Add an actual example that demonstrates this requirement]'));
      if(result)lines.push('RESULT OR SCOPE: '+result);
      lines.push('');if(requirement&&evidence)completed++;
    }
    if(!lines.some(l=>l.startsWith('REQUIREMENT ')))return {text:'Enter at least one requirement and an example from your experience before generating the outline.',count:0};
    lines.push('Evidence paired with a requirement: '+completed+' of 3 possible entries.');
    lines.push('Next: check accuracy, dates, hours worked and specialized-experience level for the specific announcement.');
    return {text:lines.join('\n'),count:completed};
  }
  document.addEventListener('DOMContentLoaded',()=>{
    const form=byId('fe-form');if(!form)return;
    form.addEventListener('submit',event=>{
      event.preventDefault();
      const result=outline(),section=byId('fe-output-section');
      section.hidden=false;byId('fe-output').value=result.text;
      if(result.count>0)document.dispatchEvent(new Event('growth:free-tool-completed'));
      section.scrollIntoView({block:'start',behavior:'smooth'});
    });
    byId('fe-clear').addEventListener('click',()=>{form.reset();byId('fe-output-section').hidden=true;byId('fe-copy-status').textContent='';});
    byId('fe-copy').addEventListener('click',async()=>{
      try{await navigator.clipboard.writeText(byId('fe-output').value);byId('fe-copy-status').textContent='Copied';}
      catch{byId('fe-output').focus();byId('fe-output').select();byId('fe-copy-status').textContent='Select and copy the text';}
    });
  });
  if(typeof module!=='undefined')module.exports={outline};
})();

'use strict';
(()=>{
 const $=id=>document.getElementById(id),form=$('intake-form');if(!form)return;
 const steps=[...form.querySelectorAll('.builder-step')];let current=0,email=null;
 const progress=document.createElement('nav');progress.className='builder-progress';progress.setAttribute('aria-label','Application steps');
 const meter=document.createElement('progress');meter.max=steps.length;meter.setAttribute('aria-label','Application progress');
 const buttons=steps.map((step,i)=>{const b=document.createElement('button');b.type='button';b.textContent=(i+1)+'. '+step.dataset.title;b.addEventListener('click',()=>show(i));progress.append(b);return b;});
 form.prepend(progress,meter);
 const controls=document.createElement('div');controls.className='toolbar wizard-controls';
 for(const [label,delta]of [['Back',-1],['Next',1]]){const b=document.createElement('button');b.type='button';b.textContent=label;b.className='secondary';b.addEventListener('click',()=>show(current+delta));controls.append(b);}
 form.append(controls);steps.at(-1).append($('design-selection'));
 for(const [id,step]of [['from-scratch',0],['from-existing',1],['for-job',2]])$(id).addEventListener('click',()=>show(step));
 function show(i,focus=true){current=Math.max(0,Math.min(steps.length-1,i));steps.forEach((step,n)=>{step.hidden=n!==current;buttons[n].setAttribute('aria-current',n===current?'step':'false');});meter.value=current+1;controls.firstChild.disabled=current===0;controls.lastChild.disabled=current===steps.length-1;if(focus)steps[current].querySelector('h2').focus();}
 // Drafts may be incomplete; full server validation runs before generation/export.
 form.noValidate=true;
 const ids=['type','name','contact','role','skills','education','jobPosting','jobUrl','instructions','resumeText','template','accentColor','design-font','design-size','design-spacing','targetSeries','targetGrade','assessmentQuestions'];
 function recover(){if(new URLSearchParams(location.search).has('edit'))return;try{const raw=JSON.parse(sessionStorage.getItem('cl-builder-recovery'));if(!raw||Date.now()-raw.at>2*3600000||raw.email&&email&&raw.email!==email){sessionStorage.removeItem('cl-builder-recovery');return;}for(const id of ids)if(typeof raw.fields?.[id]==='string'&&$(id))$(id).value=raw.fields[id];if(Array.isArray(raw.jobs)&&raw.jobs.length){const boxes=[...$('jobs').children];raw.jobs.slice(0,8).forEach((job,i)=>{if(!boxes[i])$('add-job').click();const box=$('jobs').children[i];for(const field of box?.querySelectorAll('[data-key]')||[])if(typeof job[field.dataset.key]==='string')field.value=job[field.dataset.key];});}$('consent').checked=raw.consent===true;show(raw.step||0,false);document.dispatchEvent(new Event('change'));$('save-status').textContent='Recovered unfinished details from this browser tab. Review them before saving.';}catch{sessionStorage.removeItem('cl-builder-recovery');}}
 let timer;
 function changed(){clearTimeout(timer);timer=setTimeout(()=>{if(!$('consent').checked)return;const data={at:Date.now(),email,consent:true,step:current,fields:Object.fromEntries(ids.map(id=>[id,$(id)?.value||''])),jobs:[...$('jobs').children].map(box=>Object.fromEntries([...box.querySelectorAll('[data-key]')].map(el=>[el.dataset.key,el.value])))};try{sessionStorage.setItem('cl-builder-recovery',JSON.stringify(data));}catch{$('save-status').textContent='Browser recovery storage is unavailable. Save to your account to preserve work.';}document.dispatchEvent(new Event('builder-save'));},250);}
 form.addEventListener('input',changed);form.addEventListener('change',changed);$('design-selection').addEventListener('change',changed);
 form.addEventListener('click',e=>{if(e.target.closest('#add-job,.job button'))changed();});document.addEventListener('builder-ready',recover);
 document.addEventListener('builder-session',e=>{email=e.detail.email;recover();});document.addEventListener('builder-loaded',()=>document.dispatchEvent(new Event('change')));
 $('clear-tab-draft').addEventListener('click',()=>{sessionStorage.removeItem('cl-builder-recovery');$('save-status').textContent='This tab’s recovery copy is cleared. Saved account applications are unchanged.';});
 const federal=()=>{$('federal-guidance').hidden=$('type').value!=='federal';};$('type').addEventListener('change',federal);document.addEventListener('builder-loaded',federal);document.addEventListener('builder-ready',federal);
 $('for-federal').addEventListener('click',()=>{$('type').value='federal';federal();$('template').value='classic';show(0);changed();document.dispatchEvent(new Event('change'));});
 $('for-cover').addEventListener('click',()=>{show(1);$('quick-start-tip').textContent='Add your résumé facts and target role. Paid plans include a matching cover letter in Word and PDF; you can use the letter independently.';});
 const help=document.createElement('details');help.className='writing-help';const summary=document.createElement('summary');summary.textContent='Not sure what to write? Start with these questions';help.append(summary);const list=document.createElement('ul');for(const question of ['What did you do in this role on a typical day?','Did you supervise or train anyone? Describe only your actual responsibility.','What tools, software, or equipment did you use?','Did you coordinate schedules, projects, budgets, or personnel?','What improved because of your work? Include numbers only if you can verify them.','For military experience, explain duties in plain language without assuming civilian credentials.']){const li=document.createElement('li');li.textContent=question;list.append(li);}help.append(list);$('jobs').before(help);
 $('import-job-url')?.addEventListener('click',()=>document.dispatchEvent(new Event('builder-import-job')));
 show(0,false);recover();federal();
})();

'use strict';
// Free Job Match Checker. Runs entirely in the browser: nothing typed here is sent anywhere.
(function(){
 const STOP=new Set(('a about above across after again against all also am an and any are as at be because been before being below between both but by can could did do does doing down during each either else ensure etc ever every few for from further get had has have having he her here hers him his how i if in into is it its itself just least less like may me might more most must my no nor not of off on once only or other our ours out over own per please rather same she should so some such than that the their theirs them then there these they this those through to too under until up upon us very via was we were what when where whether which while who whom why will with within without would you your yours '+
 'specialized ability able applicant applicants apply candidate candidates company duties duty experience including include includes job knowledge level new one position preferred required requirement requirements responsibilities responsible role skills skill strong team work working year years well using use used make makes made provide provides providing ensure ensures related relevant various within across based help helps etc e.g i.e minimum qualified qualification qualifications demonstrated proven excellent good great best plus equivalent environment opportunity opportunities employer employee employees time full part day days week weeks month months position positions hire hiring salary benefits pay location remote hybrid onsite office travel').split(/\s+/));
 const $=id=>document.getElementById(id);
 const norm=s=>s.toLowerCase().replace(/[‘’]/g,"'").replace(/[^a-z0-9+#./\- ]+/g,' ');
 const stem=w=>w.length>4?w.replace(/(ies)$/,'y').replace(/(ing|ed|es|s)$/,''):w;
 const words=s=>norm(s).split(/\s+/).map(w=>w.replace(/^[./\-]+|[./\-]+$/g,'')).filter(Boolean);

 const VERBS=new Set('develop develops developing analyze analyzes analyzing prepare prepares preparing coordinate coordinates coordinating perform performs performing serve serves serving assist assists assisting supporting conduct conducts conducting maintain maintains maintaining review reviews reviewing manage manages managing planning lead leads leading oversee oversees ensure ensures identify identifies apply applies applying demonstrate demonstrates communicate communicates seeking seek looking join'.split(' '));
 function chunks(line){
  // RAKE-style: split on punctuation, stop words and duty verbs to get candidate phrases.
  const out=[];let cur=[];
  line.toLowerCase().replace(/[‘’]/g,"'").split(/([,;:()!?|••]|\.(?=\s|$)|\s+)/).forEach(tok=>{
   const w=(tok||'').trim().replace(/^[./\-]+|[./\-]+$/g,'');
   if(!w)return;
   if(/^[,;:()!?|••.]$/.test(w)||STOP.has(w)||VERBS.has(w)||/^\d+$/.test(w)||!/[a-z]/.test(w)){if(cur.length)out.push(cur);cur=[];return;}
   cur.push(w.replace(/[^a-z0-9+#./\-]/g,''));
  });
  if(cur.length)out.push(cur);
  const res=[];
  out.forEach(c=>{c=c.filter(Boolean);if(!c.length)return;
   if(c.length<=3)res.push(c);else for(let i=0;i+2<=c.length;i++)res.push(c.slice(i,i+2));});
  return res.filter(c=>!(c.length===1&&c[0].length<4&&!/[0-9+#]/.test(c[0])));
 }
 function terms(posting){
  const weight=new Map(),label=new Map();
  posting.split(/\n+/).forEach((line,li)=>{
   const boost=/(require|must|qualif|specialized experience|minimum|essential|key skill|you have|you will need|knowledge of|proficien)/i.test(line)?2:1;
   chunks(line).forEach(c=>{
    const key=c.map(stem).join(' ');
    weight.set(key,(weight.get(key)||0)+boost*(c.length>1?1.5:1)*(li===0?0.5:1));
    if(!label.has(key))label.set(key,c.join(' '));
    if(c.length>1)c.forEach(w=>{if(w.length>=4){const k=stem(w);weight.set(k,(weight.get(k)||0)+0.4*boost);if(!label.has(k))label.set(k,w);}});
   });
  });
  const ranked=[...weight.entries()].filter(([k,v])=>(v>=1.5||k.includes(' ')&&v>=1)&&!/^(gs|wg|nh)-?\d/.test(k)&&!/^\d{4}$/.test(k)).sort((a,b)=>b[1]-a[1]);
  const kept=[];
  for(const [k,v] of ranked){
   if(kept.length>=24)break;
   if(!k.includes(' ')&&kept.some(([p])=>p.split(' ').includes(k)))continue;
   kept.push([k,v]);
  }
  return kept.map(([k,v])=>({key:k,label:label.get(k),weight:Math.min(v,6)}));
 }

 function has(rs,key){
  const parts=key.split(' ');
  if(parts.length===1)return rs.set.has(key);
  return rs.joined.includes(' '+key+' ')||parts.every(p=>rs.set.has(p));
 }

 function federalChecks(posting,resume){
  const out=[];const wc=words(resume).length;
  const federal=/(gs-\d|usajobs|specialized experience|series \d{4}|federal|grade level|time-in-grade)/i.test(posting);
  if(!federal)return {federal,out};
  out.push(wc>1100?['warn','About '+wc+' words. Federal résumés submitted through USAJOBS are limited to two pages, which is usually about 900–1,100 words.']:['ok','About '+wc+' words, which should fit the two-page federal limit.']);
  out.push(/(hours? per week|hrs\/wk|\d{2}\s*hours)/i.test(resume)?['ok','Hours per week are listed.']:['warn','Add hours worked per week for each job. Federal reviewers use them to credit experience.']);
  out.push(/((0?[1-9]|1[0-2])\/(19|20)\d{2})|((jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(19|20)\d{2})/i.test(resume)?['ok','Employment dates include the month and year.']:['warn','Show start and end dates with month and year for each job.']);
  out.push(/(gs-\d|series|grade)/i.test(resume)?['ok','Federal series or grade appears where it applies.']:['tip','If you held federal positions, include the series and grade.']);
  return {federal,out};
 }

 function render(){
  const posting=$('jm-posting').value.trim(), resume=$('jm-resume').value.trim();
  const out=$('jm-result');
  if(posting.length<120||resume.length<120){out.hidden=false;out.innerHTML='<p class="jm-note">Paste both the full job posting and your full résumé text (at least a few sentences each).</p>';return;}
  const list=terms(posting);
  const rw=words(resume).map(stem);
  const rs={set:new Set(rw),joined:' '+rw.join(' ')+' '};
  let total=0,got=0;const hit=[],miss=[];
  list.forEach(t=>{total+=t.weight;if(has(rs,t.key)){got+=t.weight;hit.push(t);}else miss.push(t);});
  const score=total?Math.round(got/total*100):0;
  const band=score>=75?['strong','Strong match']:score>=50?['fair','Partial match']:['low','Low match'];
  const fed=federalChecks(posting,resume);
  const chip=t=>'<li>'+t.label.replace(/[<>&]/g,'')+'</li>';
  out.hidden=false;
  out.innerHTML=
   '<div class="jm-score jm-'+band[0]+'"><div class="jm-ring"><strong>'+score+'%</strong></div><div><h2>'+band[1]+'</h2><p>Your résumé uses '+hit.length+' of the '+list.length+' key terms in this posting. Phrases from the requirements count more.</p></div></div>'+
   (miss.length?'<h3>In the posting, not in your résumé</h3><ul class="jm-chips jm-miss">'+miss.map(chip).join('')+'</ul><p class="jm-note"><strong>Only add a term if it’s true for you.</strong> Use the employer’s wording where it accurately describes work you did. Never claim skills or duties you don’t have.</p>':'')+
   (hit.length?'<h3>Already in your résumé</h3><ul class="jm-chips jm-hit">'+hit.map(chip).join('')+'</ul>':'')+
   (fed.federal?'<h3>Federal résumé checks</h3><ul class="jm-checks">'+fed.out.map(([k,m])=>'<li class="jm-'+k+'">'+m+'</li>').join('')+'</ul>':'')+
   '<div class="jm-cta"><p>Want help rewriting it for this job, using only your real experience?</p><a class="button" href="/start">Tailor my résumé to this job ↗</a></div>';
  const ring=out.querySelector('.jm-ring');if(ring)ring.style.setProperty('--p',score);
  out.scrollIntoView({behavior:'smooth',block:'start'});
 }
 document.addEventListener('DOMContentLoaded',()=>{
  const b=$('jm-check');if(b)b.addEventListener('click',render);
  const c=$('jm-clear');if(c)c.addEventListener('click',()=>{$('jm-posting').value='';$('jm-resume').value='';$('jm-result').hidden=true;});
 });
 if(typeof module!=='undefined')module.exports={terms,federalChecks,has,words,stem};
})();

'use strict';
// Free cover letter check. Runs entirely in the browser: nothing typed here is sent anywhere.
(function(){
 const $=id=>document.getElementById(id);
 const CLICHES=['to whom it may concern','i am writing to apply','i am writing to express','hard worker','hard-working','team player','detail-oriented','detail oriented','go-getter','think outside the box','results-driven','results driven','passionate about','self-starter','dynamic','synergy','proven track record','fast-paced environment','perfect fit','dream job','i believe i would be','i feel that','as you can see from my resume','please find attached','i look forward to hearing from you at your earliest convenience'];
 const words=s=>(s.match(/[A-Za-z0-9'’$%.-]+/g)||[]).filter(w=>/[A-Za-z0-9]/.test(w));
 function check(letter,posting,title,company){
  const out=[],w=words(letter),n=w.length,low=letter.toLowerCase();
  const add=(level,text)=>out.push([level,text]);
  if(n<150)add('warn','About '+n+' words. Most hiring managers expect 250–400 words: enough for two or three specific examples.');
  else if(n>450)add('warn','About '+n+' words. Aim for 250–400 so it fits on one page and gets read.');
  else add('ok','About '+n+' words, a good length.');
  if(title){if(low.includes(title.toLowerCase()))add('ok','Names the job title.');else add('warn','Mention the exact job title ("'+title+'") in the first paragraph.');}
  else add('tip','Add the job title above to check that your letter names it.');
  if(company){if(low.includes(company.toLowerCase()))add('ok','Names the employer.');else add('warn','Mention the employer by name ("'+company+'"). Generic letters get skipped.');}
  if(/to whom it may concern/.test(low))add('warn','Replace "To whom it may concern" with the hiring manager\'s name, or "Dear Hiring Manager".');
  const found=CLICHES.filter(c=>c!=='to whom it may concern'&&low.includes(c));
  if(found.length)add('warn','Overused phrases: '+found.map(f=>'"'+f+'"').join(', ')+'. Replace each with a specific example of what you did.');
  else add('ok','No common clichés found.');
  const nums=(letter.match(/\b\d[\d,.]*\s?(%|percent|people|employees|customers|hours|days|weeks|months|years|\$|dollars|k\b|m\b)?/gi)||[]).length+(letter.match(/\$\d/g)||[]).length;
  if(nums>=2)add('ok','Includes specific numbers ('+nums+'). Concrete results make claims believable.');
  else add('warn','Add one or two real numbers: team size, budget, volume, time saved. Only use numbers that are true.');
  const sentences=letter.split(/[.!?]+\s/).map(s=>s.trim()).filter(Boolean),iStarts=sentences.filter(s=>/^i\b/i.test(s)).length;
  if(sentences.length&&iStarts/sentences.length>0.4)add('warn',iStarts+' of '+sentences.length+' sentences start with "I". Lead some sentences with the employer\'s need or the result instead.');
  const long=sentences.filter(s=>words(s).length>35).length;if(long)add('tip',long+' sentence'+(long>1?'s are':' is')+' over 35 words. Split them for easier reading.');
  if(posting.trim().length>80){const STOP=new Set('the and for with that this from your will have are you our job work team role able must skills experience years including within such other into their them they about more than also any all who what when where which while each both some such only very'.split(' '));
   const freq={};for(const t of words(posting.toLowerCase()))if(t.length>4&&!STOP.has(t))freq[t]=(freq[t]||0)+1;
   const top=Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([t])=>t),missing=top.filter(t=>!low.includes(t));
   if(missing.length>6)add('warn','Your letter uses few words from the posting. Terms you could address, if they truly fit you: '+missing.slice(0,8).join(', ')+'.');
   else add('ok','Connects to the posting\'s main terms.');}
  if(!/(interview|discuss|conversation|talk|call|meet)/.test(low.slice(-400)))add('tip','End by asking for a conversation or interview, in one plain sentence.');
  if(/\[.*?\]|\bXX+\b|lorem/i.test(letter))add('warn','Looks like a placeholder is still in the letter ([brackets], XX). Replace it before sending.');
  return out;
 }
 function render(){
  const letter=$('cc-letter').value.trim(),res=$('cc-result');
  if(letter.length<200){res.hidden=false;res.innerHTML='<p class="jm-note">Paste your full cover letter (a few paragraphs).</p>';return;}
  const items=check(letter,$('cc-posting').value,$('cc-title').value.trim(),$('cc-company').value.trim());
  const warns=items.filter(i=>i[0]==='warn').length;
  const band=warns===0?['strong','Ready to send']:warns<=2?['fair','Almost there']:['low','Needs work'];
  res.hidden=false;
  res.innerHTML='<div class="jm-score jm-'+band[0]+'"><div><h2>'+band[1]+'</h2><p>'+(warns?warns+' thing'+(warns>1?'s':'')+' to fix before you send it.':'Nothing major to fix. Read it out loud once more.')+'</p></div></div><ul class="jm-checks">'+items.map(([k,m])=>'<li class="jm-'+k+'">'+m.replace(/[<>&]/g,'')+'</li>').join('')+'</ul><div class="jm-cta"><p>Want a cover letter written from your real experience for this job?</p><a class="button" href="/start">Write mine with CareerLaunch AI ↗</a></div>';
  res.scrollIntoView({behavior:'smooth',block:'start'});
 }
 if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',()=>{const b=$('cc-check');if(b)b.addEventListener('click',render);});
 if(typeof module!=='undefined')module.exports={check};
})();

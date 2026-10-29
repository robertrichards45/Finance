'use strict';
(()=>{
 const toggle=document.getElementById('career-chat-toggle'),panel=document.getElementById('career-chat-panel'),form=document.getElementById('career-chat-form'),input=document.getElementById('career-chat-question'),history=document.getElementById('career-chat-history'),submit=document.getElementById('career-chat-submit');
 if(!toggle||!panel||!form||!input||!history)return;
 const add=(who,message)=>{const item=document.createElement('p');item.className='career-chat-message career-chat-'+who;item.textContent=message;history.append(item);history.scrollTop=history.scrollHeight;};
 toggle.addEventListener('click',()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)input.focus();});
 form.addEventListener('submit',async event=>{
  event.preventDefault();const question=input.value.trim();if(question.length<3||question.length>800)return;
  add('customer',question);input.value='';submit.disabled=true;
  try{const response=await fetch('/api/site-assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question})});const data=await response.json();if(!response.ok)throw Error(data.error||'Please try again.');add('assistant',data.answer);if(Array.isArray(data.references)&&data.references.length){const refs=document.createElement('div');refs.className='career-chat-references';const heading=document.createElement('strong');heading.textContent='Official sources (check current guidance):';refs.append(heading);for(const ref of data.references){if(!/^https:\/\/(www\.opm\.gov|usajobshelp\.opm\.gov)\//.test(ref.url))continue;const link=document.createElement('a');link.href=ref.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=ref.title;refs.append(link);}history.append(refs);history.scrollTop=history.scrollHeight;}}
  catch(error){add('assistant',error.message||'Assistant temporarily unavailable.');}
  finally{submit.disabled=false;input.focus();}
 });
})();

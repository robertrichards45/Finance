'use strict';
// Aggregate, allowlisted events only. No URL, free text, contact details or resume content.
document.addEventListener('click',event=>{const link=event.target.closest('a');if(!link||navigator.globalPrivacyControl)return;const name=link.dataset.growthEvent||(link.getAttribute('href')?.startsWith('/portal?plan=')?'plan_selected':null);if(!['builder_cta','plan_selected'].includes(name))return;fetch('/api/marketing-event',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({event:name}),keepalive:true}).catch(()=>{});});

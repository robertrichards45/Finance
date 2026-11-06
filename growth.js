'use strict';
// Privacy-respecting, aggregate conversion signals; no emails, document text or URLs sent.
const allowed=new Set(['builder_cta','plan_selected','pricing_viewed','example_viewed','sign_in_started']);
const sent=new Set();
function report(event,once=false){
 if(!allowed.has(event)||navigator.globalPrivacyControl||navigator.doNotTrack==='1')return;
 if(once&&sent.has(event))return;
 if(once)sent.add(event);
 fetch('/api/marketing-event',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({event}),keepalive:true}).catch(()=>{});
}
document.addEventListener('click',event=>{
 const link=event.target.closest('a');if(!link)return;
 const name=link.dataset.growthEvent||(link.getAttribute('href')?.startsWith('/portal?plan=')?'plan_selected':null);
 if(name==='builder_cta'||name==='plan_selected')report(name);
});
document.addEventListener('submit',event=>{if(event.target?.id==='login-form')report('sign_in_started',true)});
document.addEventListener('DOMContentLoaded',()=>{
 if(location.pathname==='/examples')report('example_viewed',true);
 const pricing=document.getElementById('pricing');
 if(pricing&&'IntersectionObserver' in window){
  const observer=new IntersectionObserver(entries=>{
   if(entries.some(e=>e.isIntersecting)){report('pricing_viewed',true);observer.disconnect()}
  },{threshold:0.2});
  observer.observe(pricing);
 }
});
document.addEventListener('growth:free-tool-completed',()=>{
 if(navigator.globalPrivacyControl||navigator.doNotTrack==='1')return;
 fetch('/api/marketing-event',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({event:'free_tool_completed'}),keepalive:true}).catch(()=>{});
});

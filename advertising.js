/* This script is only included after publisher, placement and consent setup. */
(()=>{'use strict';
 const pages=new Set(['/','/index.html','/services','/resume-builder','/federal-resume-guide','/federal','/private-sector']);
 if(!pages.has(location.pathname)||location.search||location.hash||navigator.globalPrivacyControl===true)return;
 const slot=document.querySelector('ins.adsbygoogle');if(!slot)return;
 const client=slot.getAttribute('data-ad-client');if(!/^ca-pub-\d{16}$/.test(client||''))return;
 const script=document.createElement('script');script.async=true;script.crossOrigin='anonymous';
 script.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+client;
 script.addEventListener('load',()=>{try{(window.adsbygoogle=window.adsbygoogle||[]).push({});}catch{slot.closest('aside')?.remove();}});
 script.addEventListener('error',()=>slot.closest('aside')?.remove());
 document.head.append(script);
})();

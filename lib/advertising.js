'use strict';
// Third-party advertising is restricted to public, non-personalized pages.
const PAGES=new Set(['/','/index.html','/services','/resume-builder','/federal-resume-guide','/federal','/private-sector']);
function settings(env=process.env){
 const client=/^ca-pub-\d{16}$/.test(env.ADSENSE_CLIENT||'')?env.ADSENSE_CLIENT:'';
 const slot=/^\d{10}$/.test(env.ADSENSE_SLOT||'')?env.ADSENSE_SLOT:'';
 return {client,slot,enabled:Boolean(client&&slot&&env.ADS_ENABLED==='true'&&env.ADS_CONSENT_READY==='true')};
}
function decorate(html,url,ads){
 if(!PAGES.has(url.pathname)||url.search||!ads?.client)return html;
 html=html.replace('</head>','<meta name="google-adsense-account" content="'+ads.client+'"></head>');
 if(!ads.enabled)return html;
 return html.replace('</main>','<aside class="advertisement shell" aria-label="Advertisement"><p class="fine">Advertisement</p><ins class="adsbygoogle" data-ad-client="'+ads.client+'" data-ad-slot="'+ads.slot+'" data-ad-format="auto" data-full-width-responsive="true"></ins></aside></main>')
  .replace('</head>','<script src="/advertising.js" defer></script></head>');
}
function adsTxt(ads){return ads?.client?'google.com, '+ads.client.replace('ca-','')+', DIRECT, f08c47fec0942fa0\n':null;}
module.exports={PAGES,settings,decorate,adsTxt};

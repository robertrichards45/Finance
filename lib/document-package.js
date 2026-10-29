'use strict';
const {validateDraft}=require('./ai-draft');
const {buildText,escapeXml}=require('./draft-export');
function escapeHtml(v){return escapeXml(v)}
function renderReviewPage(input){
 const {role,draft}=input||{};
 const checked=validateDraft(draft);
 if(!checked.ok||typeof role!=='string'||role.trim().length<3||role.length>100)throw Error('Invalid draft');
 const d=checked.draft;
 const section=(title,body)=>'<section><h2>'+escapeHtml(title)+'</h2>'+body+'</section>';
 const paras=s=>'<p>'+escapeHtml(s).replace(/\n/g,'<br>')+'</p>';
 const list=arr=>'<ul>'+arr.map(s=>'<li>'+escapeHtml(s)+'</li>').join('')+'</ul>';
 const body=section('Professional summary',paras(d.summary))+section('Skills',paras(d.skills))+section('Experience',list(d.experienceBullets))+section('Cover letter',paras(d.coverLetter))+section('Verify before applying',list(d.verificationQuestions));
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Review draft</title><style>body{font:16px system-ui,sans-serif;max-width:780px;margin:2rem auto;padding:0 1rem;color:#17243a;line-height:1.6}section{border-bottom:1px solid #ddd;padding:1rem 0}h1,h2{line-height:1.2}p{white-space:normal}@media print{body{margin:0;max-width:none}section{break-inside:avoid}}</style></head><body><h1>Application draft — '+escapeHtml(role)+'</h1><p><strong>Review required:</strong> Verify every claim before submitting an application.</p>'+body+'</body></html>';
}
function exportPlainText(input){const {role,draft}=input||{};const v=validateDraft(draft);if(!v.ok||typeof role!=='string'||role.length<3||role.length>100)throw Error('Invalid draft');return buildText(v.draft,role)}
module.exports={renderReviewPage,exportPlainText};

'use strict';
function escapeXml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;')}
function buildText(draft,role){
 const parts=['CAREERLAUNCH AI — DRAFT FOR REVIEW','TARGET ROLE: '+role,'','PROFESSIONAL SUMMARY',draft.summary,'','CORE SKILLS',draft.skills,'','EXPERIENCE',...draft.experienceBullets.map(x=>'• '+x),'','COVER LETTER',draft.coverLetter,'','ITEMS TO VERIFY',...draft.verificationQuestions.map(x=>'- '+x),'','Review and verify every statement before applying.'];
 return parts.join('\n');
}
function buildHtml(draft,role){
 const text=buildText(draft,role);
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Application draft</title><style>body{font:12pt Arial,sans-serif;max-width:750px;margin:45px auto;line-height:1.5;white-space:pre-wrap;color:#182338} @media print{body{margin:0}}</style></head><body>'+escapeXml(text)+'</body></html>';
}
module.exports={buildText,buildHtml,escapeXml};

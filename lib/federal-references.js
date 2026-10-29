'use strict';
// Curated official reference URLs, not live search results. Review periodically.
const REFERENCES=[
 {id:'spouse',title:'OPM — Military spouse and family hiring authorities',url:'https://www.opm.gov/fedshirevets/hiring-officials/strategic-recruitment-and-hiring/military-spouses-family-members/',pattern:/spous|military wife|military husband|family member appoint/i,summary:'Military spouse noncompetitive authority is discretionary and distinct from a selection preference. Eligibility and required documents vary.'},
 {id:'veterans',title:'OPM — Veterans preference guide',url:'https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals',pattern:/veteran|preference|dd.?214|sf.?15|5.point|10.point/i,summary:'Veterans preference depends on the appointment process and applicant eligibility; it does not guarantee selection.'},
 {id:'veteran-authorities',title:'OPM — Special hiring authorities for veterans',url:'https://www.opm.gov/fedshirevets/hiring-officials/strategic-recruitment-and-hiring/veterans/',pattern:/vra|veoa|30 percent|disabled veteran|veteran/i,summary:'VRA, VEOA, and disabled-veteran appointment authorities have different eligibility and selection rules.'},
 {id:'military-service',title:'USAJOBS — Answering military service questions',url:'https://usajobshelp.opm.gov/hc/en-us/articles/53059550898451-How-to-answer-questions-about-military-service',pattern:/veteran|military service|dd.?214|disability/i,summary:'USAJOBS explains veteran hiring paths and service-document requirements.'},
 {id:'direct-hire',title:'OPM — Direct Hire Authority',url:'https://www.opm.gov/policy-data-oversight/hiring-information/direct-hire-authority/',pattern:/direct.hire|dha|hiring authority/i,summary:'Veterans preference does not apply to selection under direct-hire authority.'}
];
function referencesFor(question){return REFERENCES.filter(r=>r.pattern.test(question)).slice(0,3).map(({id,title,url,summary})=>({id,title,url,summary}));}
module.exports={referencesFor};

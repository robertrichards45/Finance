'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {renderReviewPage,exportPlainText}=require('../lib/document-package');
const draft={summary:'Led teams',skills:'Operations',experienceBullets:['Prepared reports'],coverLetter:'Dear hiring manager,',verificationQuestions:['Confirm dates']};
test('renders accessible printable review document',()=>{const html=renderReviewPage({role:'Analyst',draft});assert.match(html,/<h1>/);assert.match(html,/Confirm dates/);assert.match(html,/@media print/);});
test('escapes unsafe content in all fields',()=>{const html=renderReviewPage({role:'<script>alert(1)</script>',draft:{...draft,experienceBullets:['<img src=x onerror=alert(1)>']}});assert.doesNotMatch(html,/<script>/);assert.doesNotMatch(html,/<img/);});
test('exports text draft',()=>assert.match(exportPlainText({role:'Analyst',draft}),/COVER LETTER/));
test('rejects malformed draft',()=>assert.throws(()=>renderReviewPage({role:'Analyst',draft:{}})));

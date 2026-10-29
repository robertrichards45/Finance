'use strict';
const {validateDraft}=require('./ai-draft');
function validateInput(input){
 const role=input?.role;
 const result=validateDraft(input?.draft);
 if(!result.ok||typeof role!=='string'||role.trim().length<3||role.length>100)throw new Error('Invalid document data');
 return {role:role.trim(),draft:result.draft};
}
function sections(input){
 const {role,draft}=validateInput(input);
 return {role,parts:[
 ['Professional Summary',[draft.summary]],
 ['Core Skills',[draft.skills]],
 ['Professional Experience',draft.experienceBullets],
 ['Cover Letter',[draft.coverLetter]],
 ['Verify Before Applying',draft.verificationQuestions]
 ]};
}
async function generateDocx(input){
 const {Document,Paragraph,TextRun,Packer,HeadingLevel}=require('docx');
 const {role,parts}=sections(input);
 const children=[new Paragraph({text:'Application Draft — '+role,heading:HeadingLevel.TITLE}),new Paragraph({children:[new TextRun({text:'DRAFT — verify all facts before submitting',bold:true})]})];
 for(const [heading,lines] of parts){
  children.push(new Paragraph({text:heading,heading:HeadingLevel.HEADING_2}));
  for(const line of lines)children.push(new Paragraph({text:line,spacing:{after:140}}));
 }
 return Packer.toBuffer(new Document({sections:[{properties:{},children}]}));
}
async function generatePdf(input){
 const PDFDocument=require('pdfkit');
 const {role,parts}=sections(input);
 return new Promise((resolve,reject)=>{
  const pdf=new PDFDocument({size:'LETTER',margin:54,info:{Title:'Application Draft'}});
  const chunks=[];
  pdf.on('data',chunk=>chunks.push(chunk));
  pdf.on('end',()=>resolve(Buffer.concat(chunks)));
  pdf.on('error',reject);
  pdf.font('Helvetica-Bold').fontSize(17).text('Application Draft — '+role);
  pdf.moveDown(.5).fontSize(10).text('DRAFT — verify all facts before submitting');
  for(const [heading,lines] of parts){
   pdf.moveDown(.8).font('Helvetica-Bold').fontSize(12).text(heading,{keepTogether:true});
   pdf.font('Helvetica').fontSize(10);
   for(const line of lines)pdf.text(line,{paragraphGap:8});
  }
  pdf.end();
 });
}
module.exports={generateDocx,generatePdf,validateInput};

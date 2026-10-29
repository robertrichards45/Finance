'use strict';
const form=document.getElementById('form');
form.addEventListener('submit',event=>{
 event.preventDefault();
 const role=document.getElementById('role').value.trim();
 const skills=document.getElementById('strengths').value.trim();
 if(!role||!skills)return;
 const preview=document.getElementById('preview');
 preview.replaceChildren();
 const panel=document.createElement('div');panel.className='sample-schematic';panel.setAttribute('aria-label','Illustrative resume layout with placeholder bars, not usable resume content');
 const heading=document.createElement('div');heading.className='sample-schematic-heading';heading.textContent='SAMPLE LAYOUT — NOT A FINISHED RÉSUMÉ';panel.append(heading);
 const blocks=[['Name and contact',2],['Professional summary',3],['Experience',4],['Skills',2],['Education',2]];
 for(const [label,count] of blocks){const section=document.createElement('section');section.className='sample-schematic-section';const title=document.createElement('strong');title.textContent=label;section.append(title);for(let i=0;i<count;i++){const line=document.createElement('div');line.className='sample-schematic-bar';line.style.width=(i%3===0?85:i%3===1?68:94)+'%';section.append(line)}panel.append(section)}
 const watermark=document.createElement('div');watermark.className='sample-schematic-watermark';watermark.textContent='PREVIEW ONLY';panel.append(watermark);
 preview.append(panel);document.getElementById('result').hidden=false;
});

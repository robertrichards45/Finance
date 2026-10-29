'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {backup,DatabaseSync}=require('node:sqlite');
const MAGIC=Buffer.from('CLBK1');
async function snapshot(store,directory,{now=Date.now(),maxBytes=64*1024*1024,retain=3}={}){
 await fs.mkdir(directory,{recursive:true,mode:0o700});
 const filename='snapshot-'+new Date(now).toISOString().replace(/[:.]/g,'-')+'.clbk',temporary=path.join(directory,'.snapshot-'+crypto.randomUUID());
 try{
  await backup(store.db,temporary);await fs.chmod(temporary,0o600);
  if((await fs.stat(temporary)).size>maxBytes)throw Error('Backup size exceeds configured capacity');
  const bytes=await fs.readFile(temporary),iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',store.key,iv);cipher.setAAD(MAGIC);
  const ciphertext=Buffer.concat([cipher.update(bytes),cipher.final()]);
  const target=path.join(directory,filename);await fs.writeFile(target,Buffer.concat([MAGIC,iv,cipher.getAuthTag(),ciphertext]),{mode:0o600,flag:'wx'});
  const files=(await fs.readdir(directory)).filter(n=>/^snapshot-[\dTZ-]+\.clbk$/.test(n)).sort().reverse();
  for(const file of files.slice(retain))await fs.unlink(path.join(directory,file));
  return {filename,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),createdAt:now,retained:Math.min(files.length,retain)};
 }finally{await fs.rm(temporary,{force:true});}
}
async function restore(source,destination,key){
 if(!/^[a-f0-9]{64}$/i.test(key||''))throw Error('Restore key required');
 const bytes=await fs.readFile(source);if(!bytes.subarray(0,5).equals(MAGIC))throw Error('Invalid backup format');
 const cipher=crypto.createDecipheriv('aes-256-gcm',Buffer.from(key,'hex'),bytes.subarray(5,17));cipher.setAAD(MAGIC);cipher.setAuthTag(bytes.subarray(17,33));
 const plain=Buffer.concat([cipher.update(bytes.subarray(33)),cipher.final()]);
 if(plain.subarray(0,16).toString()!=='SQLite format 3\0')throw Error('Invalid restored database');
 await fs.writeFile(destination,plain,{mode:0o600,flag:'wx'});
 const db=new DatabaseSync(destination,{readOnly:true});try{if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('Restore integrity check failed');}finally{db.close();}
 return {bytes:plain.length,sha256:crypto.createHash('sha256').update(plain).digest('hex')};
}
async function runScheduled(store,directory,{now=Date.now()}={}){
 const prior=store.get('operations','backup');if(prior?.status==='ok'&&prior.data.createdAt>now-24*3600000)return prior.data;
 try{const result=await snapshot(store,directory,{now});store.put('operations','backup','operations','ok',{...result,location:'same-volume',disasterRecovery:false});return result;}
 catch{store.put('operations','backup','operations','failed',{attemptedAt:now,location:'same-volume',disasterRecovery:false});throw Error('Encrypted backup failed');}
}
module.exports={snapshot,restore,runScheduled};

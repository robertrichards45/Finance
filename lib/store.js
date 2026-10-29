'use strict';
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
// All personal payloads are authenticated AES-256-GCM ciphertext. Indexed metadata has no names or emails.
class Store{
 constructor({directory,key}){
  if(!/^[a-f0-9]{64}$/i.test(key||''))throw Error('A 256-bit encryption key is required');
  this.key=Buffer.from(key,'hex');
  fs.mkdirSync(directory,{recursive:true,mode:0o700});
  const {DatabaseSync}=require('node:sqlite');
  this.db=new DatabaseSync(path.join(directory,'careerlaunch.sqlite'));
  fs.chmodSync(path.join(directory,'careerlaunch.sqlite'),0o600);
  this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA secure_delete=ON; PRAGMA foreign_keys=ON;
   CREATE TABLE IF NOT EXISTS records(kind TEXT NOT NULL,id TEXT NOT NULL,owner TEXT NOT NULL,status TEXT NOT NULL,payload TEXT NOT NULL,created INTEGER NOT NULL,updated INTEGER NOT NULL,PRIMARY KEY(kind,id));
   CREATE INDEX IF NOT EXISTS records_owner ON records(kind,owner);
   CREATE INDEX IF NOT EXISTS records_status ON records(kind,status,updated);
   CREATE TABLE IF NOT EXISTS counters(id TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL);
   PRAGMA user_version=1;`);
 }
 seal(value,aad){const iv=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',this.key,iv);c.setAAD(Buffer.from(aad));const body=Buffer.concat([c.update(JSON.stringify(value),'utf8'),c.final()]);return Buffer.concat([iv,c.getAuthTag(),body]).toString('base64');}
 open(value,aad){const b=Buffer.from(value,'base64'),c=crypto.createDecipheriv('aes-256-gcm',this.key,b.subarray(0,12));c.setAAD(Buffer.from(aad));c.setAuthTag(b.subarray(12,28));return JSON.parse(Buffer.concat([c.update(b.subarray(28)),c.final()]).toString('utf8'));}
 put(kind,id,owner,status,data){const now=Date.now();this.db.prepare('INSERT INTO records VALUES(?,?,?,?,?,?,?) ON CONFLICT(kind,id) DO UPDATE SET owner=excluded.owner,status=excluded.status,payload=excluded.payload,updated=excluded.updated').run(kind,id,owner,status,this.seal(data,kind+':'+id),now,now);return data;}
 get(kind,id){const r=this.db.prepare('SELECT * FROM records WHERE kind=? AND id=?').get(kind,id);return r?this.decode(r):null;}
 decode(r){return {id:r.id,owner:r.owner,status:r.status,created:r.created,updated:r.updated,data:this.open(r.payload,r.kind+':'+r.id)};}
 list(kind,owner){return (owner===undefined?this.db.prepare('SELECT * FROM records WHERE kind=? ORDER BY created DESC').all(kind):this.db.prepare('SELECT * FROM records WHERE kind=? AND owner=? ORDER BY created DESC').all(kind,owner)).map(r=>this.decode(r));}
 delete(kind,id){this.db.prepare('DELETE FROM records WHERE kind=? AND id=?').run(kind,id);}
 quota(id,limit,windowMs){const now=Date.now();this.db.prepare('DELETE FROM counters WHERE expires<?').run(now);const row=this.db.prepare('SELECT count FROM counters WHERE id=?').get(id);if(row&&row.count>=limit)return false;this.db.prepare('INSERT INTO counters VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1').run(id,now+windowMs);return true;}
 transaction(fn){this.db.exec('BEGIN IMMEDIATE');try{const result=fn();this.db.exec('COMMIT');return result;}catch(e){this.db.exec('ROLLBACK');throw e;}}
 close(){if(this.db.isOpen)this.db.close();}
}
module.exports={Store};

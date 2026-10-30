'use strict';
const test=require('node:test'),assert=require('node:assert/strict');const {SITES,watcher}=require('../lib/uptime');
test('uptime watcher alerts after two failures, once per 6 hours, and reports recovery',async()=>{
 const va=SITES['vetassistance.org'];const results={[va]:[false,false,false,true]};const sent=[];
 const run=watcher(s=>sent.push(s),{checker:async url=>url===va?results[va].shift():true,now:()=>1e12});
 await run();assert.deepEqual(sent,[]);await run();assert.deepEqual(sent,['vetassistance.org looks down']);
 await run();assert.equal(sent.length,1);await run();assert.equal(sent.at(-1),'vetassistance.org is back up');
});

'use strict';
const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const root=__dirname;
const port=Number(process.env.PORT)||3000;
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.ico':'image/x-icon'};
const allowed=new Set(['/','/index.html','/order.html','/styles.css','/order.js','/robots.txt','/privacy.html','/terms.html']);
const headers={'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",'Cache-Control':'no-store'};
const app=http.createServer(async(req,res)=>{
  const send=(status,body,type='text/plain; charset=utf-8')=>{res.writeHead(status,{...headers,'Content-Type':type});res.end(body)};
  if(req.method!=='GET'&&req.method!=='HEAD')return send(405,'Method not allowed');
  let url;try{url=new URL(req.url,'http://localhost')}catch{return send(400,'Invalid URL')}
  if(url.pathname==='/health')return send(200,JSON.stringify({status:'ok',service:'careerlaunch-ai',checkoutEnabled:false}),mime['.json']);
  if(!allowed.has(url.pathname))return send(404,'Not found');
  const filename=path.join(root,url.pathname==='/'?'index.html':url.pathname.slice(1));
  try{const data=await fs.readFile(filename);res.writeHead(200,{...headers,'Content-Type':mime[path.extname(filename)]||'application/octet-stream'});res.end(req.method==='HEAD'?undefined:data)}
  catch{return send(404,'Not found')}
});
if(require.main===module)app.listen(port,()=>console.log('CareerLaunch AI listening on '+port));
module.exports=app;

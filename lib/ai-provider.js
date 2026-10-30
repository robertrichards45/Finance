'use strict';
const {createMessages,validateDraft}=require('./ai-draft');
const MAX_RESPONSE_BYTES=120000;
async function generateDraft(input,{apiKey=process.env.OPENAI_API_KEY,model=process.env.OPENAI_MODEL||'gpt-5.6-terra',fetchImpl=fetch,timeoutMs=30000}={}){
 const prepared=createMessages(input);
 if(!prepared.ok)return {ok:false,errors:prepared.errors};
 if(!apiKey)return {ok:false,error:'AI provider is not configured'};
 if(!/^[-\w.]{1,80}$/.test(model))return {ok:false,error:'Invalid model configuration'};
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetchImpl('https://api.openai.com/v1/chat/completions',{
   method:'POST',signal:controller.signal,
   headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},
   body:JSON.stringify({model,messages:prepared.messages,response_format:{type:'json_object'},max_completion_tokens:2200})
  });
  if(!response.ok)return {ok:false,error:'AI service unavailable ('+response.status+')'};
  const raw=await response.text();
  if(Buffer.byteLength(raw)>MAX_RESPONSE_BYTES)return {ok:false,error:'AI response too large'};
  const parsed=JSON.parse(raw);
  const content=parsed?.choices?.[0]?.message?.content;
  const result=validateDraft(content);
  if(!result.ok)return {ok:false,error:result.error};
  return {ok:true,draft:result.draft,requiresCustomerReview:true};
 }catch{return {ok:false,error:'AI request failed or timed out'};}
 finally{clearTimeout(timeout)}
}
module.exports={generateDraft};

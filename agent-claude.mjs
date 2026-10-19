// Research agent: Claude + server-side web search, forced to return a structured guide with per-claim evidence.
const KEY=process.env.ANTHROPIC_API_KEY, MODEL=process.env.MODEL||"claude-sonnet-5-5";
const claim={type:"object",properties:{text:{type:"string"},evidence:{type:"string",enum:["docs","unverified"]},source:{type:"string",description:"URL of a page you actually retrieved that supports this, or empty"}},required:["text","evidence"]};
const arr={type:"array",items:{type:"string"}};
const SUBMIT={name:"submit_guide",description:"Submit the final guide.",input_schema:{type:"object",required:["app","supportsOAuth","difficulty","verdict","time","effort","blockers","steps","agent","you","uncertain","sources"],properties:{
 app:{type:"string"},supportsOAuth:{type:"boolean"},consoleUrl:{type:"string"},difficulty:{enum:["easy","medium","hard"]},verdict:{type:"string"},
 time:{type:"string",description:"Separate working time from approval wait. Say 'not documented' if unknown."},effort:{type:"string"},
 blockers:{type:"array",items:claim},steps:arr,agent:{...arr,description:"What an agent can do for the developer"},you:{...arr,description:"What the human must do"},
 uncertain:arr,sources:{type:"array",items:{type:"object",properties:{title:{type:"string"},url:{type:"string"}},required:["title","url"]}}}}};
const SYSTEM=`You investigate how a developer gets an OAuth app set up and approved with a provider, so their AI agent's end users can connect that app.
Search the web for the provider's official developer docs, then fetch the key pages in full (OAuth setup, app review or verification, rate limits, policies). Snippets miss fine print, so do not rely on them for review requirements. Cover: where the OAuth app is created, required fields (redirect URIs, privacy policy, verified domain), scopes, any app review/verification/partner approval, security assessments, fees, rate limits for unapproved apps, and reported wait times.
Rules: mark a claim "docs" only if a page you fetched supports it, and put that URL in source. Otherwise "unverified". Never invent URLs. If the app has no OAuth, say so via supportsOAuth=false and explain in verdict. Report wait times only as documented; otherwise say not documented. Distinguish tasks an agent can do (draft scopes, write flow code, run a test against an account the developer owns) from tasks only a human can do (account creation, legal pages, review forms, payments, answering reviewers). No em dashes. Finish by calling submit_guide.`;
export async function research(input, log=()=>{}){
 if(!KEY) throw new Error("ANTHROPIC_API_KEY not set");
 const messages=[{role:"user",content:`App or website: ${input}`}];
 for(let i=0;i<16;i++){
  const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"content-type":"application/json","x-api-key":KEY,"anthropic-version":"2023-06-01","anthropic-beta":"web-fetch-2025-09-10"},
   body:JSON.stringify({model:MODEL,max_tokens:8000,system:SYSTEM,messages,tools:[{type:"web_search_20250305",name:"web_search",max_uses:8},{type:"web_fetch_20250910",name:"web_fetch",max_uses:10,max_content_tokens:30000},SUBMIT]})});
  const j=await r.json(); if(!r.ok) throw new Error(j.error?.message||r.statusText);
  for(const b of j.content){ if(b.type==="server_tool_use") log(b.name+": "+(b.input?.query||b.input?.url||"")); }
  const sub=j.content.find(b=>b.type==="tool_use"&&b.name==="submit_guide"); if(sub) return sub.input;
  messages.push({role:"assistant",content:j.content});
  if(j.stop_reason==="pause_turn") continue;
  messages.push({role:"user",content:"Call submit_guide now."});
 }
 throw new Error("agent did not submit a guide");
}

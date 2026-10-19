// Free-tier research agent (Gemini). Three passes, evidence enforced in code:
// 1 DISCOVER: Google Search grounding finds candidate official docs pages (redirect links resolved to real URLs).
// 2 READ: URL context reads those pages in full; only pages that were actually retrieved count as evidence.
// 3 STRUCTURE: turn notes into guide JSON. Sources are built in code from retrieved pages; a blocker is "docs" only if it cites one.
const KEY=process.env.GEMINI_API_KEY, MODEL=process.env.GEMINI_MODEL||"gemini-2.5-flash";
const S=(d)=>({type:"STRING",...(d?{description:d}:{})}), A=(i)=>({type:"ARRAY",items:i});
const SCHEMA={type:"OBJECT",required:["app","supportsOAuth","difficulty","verdict","time","effort","requirements","blockers","steps","agent","you","uncertain"],properties:{
 app:S(),supportsOAuth:{type:"BOOLEAN"},consoleUrl:S("URL where the developer creates the OAuth app, only if it appears in the notes, else empty"),difficulty:{type:"STRING",enum:["easy","medium","hard"]},verdict:S(),
 time:S("Separate working time from approval wait. Say 'not documented' if unknown."),effort:S(),
 requirements:A({type:"OBJECT",required:["text","evidence"],properties:{text:S(),evidence:{type:"STRING",enum:["docs","third-party","unverified"]},source:S("Exact URL from RETRIEVED PAGES, or empty")}}),
 blockers:A({type:"OBJECT",required:["text","evidence"],properties:{text:S(),evidence:{type:"STRING",enum:["docs","third-party","unverified"]},source:S("Exact URL from RETRIEVED PAGES, or empty")}}),
 steps:A(S()),agent:A(S()),you:A(S()),uncertain:A(S())}};
const DISCOVER=`Find OFFICIAL developer documentation pages (the provider's own domains, for example docs., developers., developer., api., support.) for this product. Run separate searches so you find a page for EACH of these: (1) creating an OAuth app and its required fields, (2) app review, verification, certification, marketplace or directory listing requirements and the review timeline, (3) scopes, rate limits, fees and plan requirements. Also search for the provider's own changelog or policy pages if relevant. Briefly list the pages you found and which topic each covers.`;
const READ=`You are investigating how a developer sets up and gets approved an OAuth app with a provider, so their AI agent's end users can connect that app. Read the provided pages in full. Write plain-text notes covering ONLY what the pages actually say: where the OAuth app is created, fields required to create it, scopes, whether apps need review/verification/approval before other workspaces or users can use them, any assessments, fees, rate limits, documented wait times. After each fact put the page URL in brackets. If the pages do not say something, write "NOT STATED" for it. Never infer, never use outside knowledge.`;
const STRUCTURE=`Turn the research notes into the guide JSON. Rules:
- "requirements" = things the developer must supply or satisfy to create the app (required fields, formats, limits, callback URL rules). Use the docs' exact field names, not generic labels (if the docs call it client_uri, say so).
- "blockers" = only GATES and WAITS: approval or review before the app works for other users, security assessments, fees, partner programs, restrictions on unapproved apps, rate limits. Do not put field validation rules here. If the notes show no gate, leave blockers empty.
- Every requirement and blocker needs a URL from RETRIEVED PAGES in source. Use "docs" only when that page is on the provider\'s own domain; use "third-party" when only a blog, vendor or comparison site says it; otherwise omit it or move it to "uncertain".
- User consent at install ("users can decline scopes", "users must approve access") is NOT a review gate. Only list a gate if the provider itself reviews or approves the app, charges, or limits it. Do not write "approval", "partner approval" or "slow" unless a provider page says so.
- Anything the notes mark NOT STATED, or you cannot support, goes in "uncertain" as a plain statement. Never present it as a requirement or blocker.
- "time": only setup effort and approval/review wait. Never include token lifetimes or rate limits. Separate working time from approval wait. If the docs give no figure, write "not documented" and you may add a clearly labeled estimate, e.g. "Working time (estimate, not from docs): about 30 minutes".
- "difficulty": base it only on the notes; with thin evidence say medium and explain in verdict.
- "steps": concrete, from the notes. "agent": what an AI agent can do (draft scopes, write flow code, test against an account the developer owns). "you": what only a human can do (account creation, legal pages, review forms, payments, answering reviewers, approving final scopes). Never repeat the same task on both sides; if both are involved, word the agent part as a draft and the human part as the approval.
- Features used by workspace admins or end users (for example admins approving third-party apps before members install them, or plans the customer needs) are NOT gates on the developer. Mention them only in "uncertain" or the verdict, never as a gate or as something the developer must pay for.
- "requirements" are things the docs say are required. Recommendations ("recommended", "best practice") do not belong there; put them in steps. Do not list anything under "you" that the notes say is not required.
- Include a numeric limit (rate limit, quota) only if a retrieved page states that exact number.
- No em dashes.`;
const sleep=ms=>new Promise(s=>setTimeout(s,ms));
const norm=u=>{try{const x=new URL(u);x.hash="";return (x.origin+x.pathname).replace(/\/$/,"")+x.search}catch{return ""}};
const MODELS=[MODEL,...(process.env.GEMINI_FALLBACKS||"gemini-3.8-flash,gemini-3.7-flash").split(",").filter(m=>m&&m!==MODEL)];
let lastCall=0;const GAP=+(process.env.GEMINI_GAP_MS||13000); // free tier is 5 requests/min
async function throttle(){const w=lastCall+GAP-Date.now();if(w>0){console.log(`waiting ${Math.ceil(w/1000)}s (free-tier rate limit)`);await sleep(w)}lastCall=Date.now()}
async function call(body,tries=4){
 let lastMsg="";const allErr=[];
 for(const model of MODELS){
  const url=`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  for(let i=0;i<tries;i++){
   let r,j;await throttle();
   try{r=await fetch(url,{method:"POST",headers:{"content-type":"application/json","x-goog-api-key":KEY},body:JSON.stringify(body),signal:AbortSignal.timeout(120000)});j=await r.json().catch(()=>({}))}
   catch(e){lastMsg=model+": "+e.message;break}
   if(r.ok)return j;
   lastMsg=`${model} ${r.status}: ${j.error?.message||r.statusText}`;allErr.push(lastMsg.slice(0,160));
   console.log("gemini error:",lastMsg.slice(0,300));
   if(r.status===429||r.status===503){
    if(/per day|PerDay/i.test(lastMsg))break;
    const m=/retry in ([\d.]+)s/i.exec(lastMsg);if(r.status===429&&!m&&i>=1)break; // no retry hint twice: this model has no quota, try the next one
    await sleep(Math.min(m?Math.ceil(+m[1])*1000+500:8000*(i+1),30000));continue}
   if(r.status===404||(r.status===400&&/not supported|not found/i.test(lastMsg)))break;
   throw new Error(lastMsg);
  }
 }
 throw new Error("Gemini unavailable. Tried: "+(allErr.length?[...new Set(allErr)].join(" || "):lastMsg));
}
const textOf=r=>(r.candidates?.[0]?.content?.parts||[]).map(p=>p.text||"").join("\n").trim();
async function resolveRedirect(u){
 if(!/vertexaisearch\.cloud\.google\.com/.test(u))return u;
 try{const r=await fetch(u,{redirect:"manual",signal:AbortSignal.timeout(8000)});return r.headers.get("location")||u}catch{return u}
}
const slugOf=i=>String(i).toLowerCase().replace(/^https?:\/\//,"").replace(/^www\./,"").replace(/\..*$/,"").replace(/[^a-z0-9]/g,"");
const tld2=h=>h.split(".").slice(-2).join(".");
const nice=u=>{try{const x=new URL(u);const seg=x.pathname.split("/").filter(Boolean).pop()||"";const w=decodeURIComponent(seg).replace(/\.[a-z]+$/,"").replace(/[-_]+/g," ").replace(/\b(oauth|api|url|ui|id|sdk)\b/gi,m=>m.toLowerCase()==="oauth"?"OAuth":m.toUpperCase()).trim();return x.hostname.replace(/^www\./,"")+(w?": "+w.charAt(0).toUpperCase()+w.slice(1):"")}catch{return u}};
export function enforce(g,retrieved,input=""){
 const slug=slugOf(input);
 let cdom="";try{cdom=tld2(new URL(g.consoleUrl).hostname)}catch{}
 const isOfficial=u=>{try{const h=new URL(u).hostname;return (slug.length>2&&h.replace(/[^a-z0-9]/g,"").includes(slug))||(cdom&&tld2(h)===cdom)}catch{return false}};
 for(const k of ["requirements","blockers"])for(const b of g[k]||[]){
  const key=norm(b.source||"");
  if(b.evidence!=="unverified"&&!retrieved.has(key)){b.evidence="unverified";b.source=""}
  else if(b.evidence!=="unverified"){b.source=retrieved.get(key).url;b.evidence=isOfficial(b.source)?"docs":"third-party"} // evidence level decided in code, not by the model
 }
 g.sources=[...retrieved.values()].map(({url})=>{return{title:nice(url),url,kind:isOfficial(url)?"official":"third-party"}})
  .sort((a,b)=>(a.kind==="official"?0:1)-(b.kind==="official"?0:1));
 return g;
}
export async function research(input,log=()=>{}){
 if(!KEY) throw new Error("GEMINI_API_KEY not set");
 // 1 DISCOVER
 log("pass 1: discover official docs (search)");
 const r1=await call({systemInstruction:{parts:[{text:DISCOVER}]},contents:[{role:"user",parts:[{text:`Product or website: ${input}`}]}],tools:[{google_search:{}}]});
 const chunks=r1.candidates?.[0]?.groundingMetadata?.groundingChunks||[];
 let cands=await Promise.all(chunks.map(async c=>({url:await resolveRedirect(c.web?.uri||""),title:c.web?.title||""})));
 const seen=new Set();cands=cands.filter(c=>{const k=norm(c.url);if(!k||seen.has(k))return false;seen.add(k);return true});
 const sl=slugOf(input);const off=c=>{try{return sl.length>2&&new URL(c.url).hostname.replace(/[^a-z0-9]/g,"").includes(sl)}catch{return false}};
 const picked=[...cands.filter(off).slice(0,10),...cands.filter(c=>!off(c)).slice(0,2)]; // official pages first, at most 2 third-party
 log("candidate pages: "+(picked.map(c=>c.url).join(" | ")||"none"));
 // 2 READ
 const retrieved=new Map();let notes="";
 if(picked.length){
  log("pass 2: read pages (url context)");
  const r2=await call({systemInstruction:{parts:[{text:READ}]},contents:[{role:"user",parts:[{text:`Product: ${input}\nPages to read:\n${picked.map(c=>c.url).join("\n")}`}]}],tools:[{url_context:{}}]});
  notes=textOf(r2);
  for(const m of r2.candidates?.[0]?.urlContextMetadata?.urlMetadata||[]){
   const u=m.retrievedUrl||m.retrieved_url, st=String(m.urlRetrievalStatus||m.url_retrieval_status||"");
   if(u&&/SUCCESS/.test(st)){const k=norm(u);const t=(picked.find(c=>norm(c.url)===k)||{}).title;retrieved.set(k,{url:u,title:t})}
  }
 }
 log(`retrieved ${retrieved.size} page(s): `+[...retrieved.values()].map(v=>v.url).join(" | "));
 if(!notes) notes="NOT STATED: no documentation pages could be read. Base nothing on outside knowledge.";
 // 3 STRUCTURE
 log("pass 3: structure");
 const list=[...retrieved.values()].map(v=>v.url).join("\n")||"(none)";
 let g;
 for(let t=0;t<2&&!g;t++){
  const r3=await call({systemInstruction:{parts:[{text:STRUCTURE}]},contents:[{role:"user",parts:[{text:`App: ${input}\n\nRETRIEVED PAGES (only these URLs may be cited):\n${list}\n\nRESEARCH NOTES:\n${notes}`}]}],generationConfig:{responseMimeType:"application/json",responseSchema:SCHEMA,temperature:0.2}});
  try{g=JSON.parse(textOf(r3).replace(/^```json\s*|```$/g,""))}catch{log("bad JSON, retrying")}
 }
 if(!g) throw new Error("model returned invalid JSON twice");
 g.agent=g.agent||[];g.you=g.you||[];g.steps=g.steps||[];g.uncertain=g.uncertain||[];g.blockers=g.blockers||[];g.requirements=g.requirements||[];
 return enforce(g,retrieved,input);
}

import {fileURLToPath} from "node:url"; import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import {research} from "./agent.mjs";
const D=path.dirname(fileURLToPath(import.meta.url)), PORT=process.env.PORT||3000;
const slug=s=>s.toLowerCase().replace(/^https?:\/\//,"").replace(/^www\./,"").replace(/\..*$/,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const read=s=>{try{return JSON.parse(fs.readFileSync(path.join(D,"guides",s+".json"),"utf8"))}catch{return null}};
const all=()=>fs.readdirSync(path.join(D,"guides")).filter(f=>f.endsWith(".json")).map(f=>JSON.parse(fs.readFileSync(path.join(D,"guides",f),"utf8")));
const send=(res,c,b,t="application/json")=>{res.writeHead(c,{"content-type":t});res.end(typeof b==="string"||Buffer.isBuffer(b)?b:JSON.stringify(b))};
const attemptLog=s=>{const f=path.join(D,"evidence",s+".json");return fs.existsSync(f)?JSON.parse(fs.readFileSync(f,"utf8")):null};
const LIM={ip:+(process.env.GEN_PER_IP_HOUR||3),day:+(process.env.GEN_PER_DAY||12)};const hits=new Map();let dayKey="",dayN=0;
const allow=ip=>{const now=Date.now(),k=new Date().toISOString().slice(0,10);if(k!==dayKey){dayKey=k;dayN=0}if(dayN>=LIM.day)return"Daily live-generation limit reached. Try the existing guides, or come back tomorrow.";const a=(hits.get(ip)||[]).filter(t=>now-t<36e5);if(a.length>=LIM.ip)return"Hourly limit reached for live generation. Try again later.";a.push(now);hits.set(ip,a);dayN++;return""};
const TYPES={".css":"text/css",".js":"text/javascript",".html":"text/html"};
http.createServer(async(req,res)=>{
 const u=new URL(req.url,"http://x");
 if(u.pathname==="/api/guides") return send(res,200,all().map(g=>({slug:g.slug,app:g.app,difficulty:g.difficulty})));
 if(u.pathname.startsWith("/api/guide/")){const s=slug(u.pathname.slice(11));const g=read(s);if(!g)return send(res,404,{error:"not found"});const a=attemptLog(s);if(a)g.attempt=a;return send(res,200,g)}
 if(u.pathname==="/api/generate"&&req.method==="POST"){
  let b="";for await(const c of req)b+=c;const q=(JSON.parse(b||"{}").q||"").trim();if(!q)return send(res,400,{error:"q required"});
  const s=slug(q);const hit=read(s);if(hit)return send(res,200,hit);
  const ip=(req.headers["x-forwarded-for"]||req.socket.remoteAddress||"").split(",")[0].trim();const why=allow(ip);if(why)return send(res,429,{error:why});
  try{const g=await research(q,m=>console.log(s,m));g.slug=s;g.generated="live agent "+new Date().toISOString().slice(0,10)+", web search only, no setup attempt";
   g.attempt={tested:false,notes:"No live setup attempt recorded."};if(g.sources&&g.sources.length)fs.writeFileSync(path.join(D,"guides",s+".json"),JSON.stringify(g,null,2));else g.generated+=" (low evidence: no docs pages could be read, not saved)";return send(res,200,g)}
  catch(e){return send(res,500,{error:e.message})}}
 const f=u.pathname==="/"||u.pathname.startsWith("/g/")?"index.html":u.pathname.slice(1);
 const p=path.join(D,"public",path.normalize(f).replace(/^(\.\.[\/\\])+/,""));
 if(!p.startsWith(path.join(D,"public"))||!fs.existsSync(p))return send(res,404,"not found","text/plain");
 send(res,200,fs.readFileSync(p),TYPES[path.extname(p)]||"text/html");
}).listen(PORT,()=>console.log("http://localhost:"+PORT));

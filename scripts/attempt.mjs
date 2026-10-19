// Setup attempt recorder. Usage: node scripts/attempt.mjs <slug> <console-url> [storageState.json]
// Opens the provider console with a session YOU logged in (save one with: npx playwright codegen --save-storage=auth.json <url>),
// records visible form fields, required markers and a screenshot. It never submits or creates anything.
import fs from "node:fs";
const [slug,url,state]=process.argv.slice(2); if(!slug||!url){console.log("usage: attempt.mjs <slug> <url> [storageState]");process.exit(1)}
const {chromium}=await import("playwright");
const b=await chromium.launch(); const c=await b.newContext(state?{storageState:state}:{}); const p=await c.newPage();
await p.goto(url,{waitUntil:"networkidle"});
const fields=await p.$$eval("input,select,textarea",els=>els.map(e=>({label:(e.labels&&e.labels[0]?.innerText)||e.placeholder||e.name||e.id,type:e.type,required:e.required||e.getAttribute("aria-required")==="true"})).filter(f=>f.label));
await p.screenshot({path:`evidence/${slug}.png`,fullPage:true});
const notes=`Loaded ${url} on ${new Date().toISOString().slice(0,10)} ${state?"authenticated":"unauthenticated"}. Fields seen: ${fields.map(f=>f.label+(f.required?"*":"")).join(", ")||"none (probably login wall)"}. Screenshot: evidence/${slug}.png. Nothing submitted.`;
fs.writeFileSync(`evidence/${slug}.json`,JSON.stringify({tested:!!state&&fields.length>0,notes,fields},null,2));
console.log(notes); await b.close();

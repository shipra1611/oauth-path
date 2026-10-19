// Setup attempt recorder. Usage: node scripts/attempt.mjs <slug> <console-url> <storageState.json> ["button text to click"]
// Opens the provider console with a session YOU logged in (save one with: npx playwright codegen --save-storage=auth.json <url>),
// tries to open the "create app" form (clicks a New/Create button), records the visible form fields and a screenshot.
// It NEVER fills in or submits anything, so no app is created.
import fs from "node:fs";
const [slug,url,state,clickText]=process.argv.slice(2);
if(!slug||!url){console.log('usage: node scripts/attempt.mjs <slug> <console-url> <auth.json> ["button text"]');process.exit(1)}
fs.mkdirSync("evidence",{recursive:true});
const {chromium}=await import("playwright");
const b=await chromium.launch(); const c=await b.newContext(state?{storageState:state}:{}); const p=await c.newPage();
await p.goto(url,{waitUntil:"networkidle"}).catch(()=>{});
const step=[`Loaded ${url}`];
const re=clickText?new RegExp(clickText,"i"):/(new|create|add|register).{0,25}(integration|app|application|connection)/i;
const btn=p.locator("button,a,[role=button]").filter({hasText:re}).first();
if(await btn.count()){const t=((await btn.innerText().catch(()=>""))||"").trim().slice(0,60);try{await btn.click({timeout:5000});await p.waitForLoadState("networkidle").catch(()=>{});await p.waitForTimeout(1500);step.push(`clicked "${t}"`)}catch{step.push(`could not click "${t}"`)}}
else step.push("no create button found");
const fields=await p.$$eval("input,select,textarea",els=>els.filter(e=>e.type!=="hidden"&&e.offsetParent!==null).map(e=>({label:((e.labels&&e.labels[0]?.innerText)||e.getAttribute("aria-label")||e.placeholder||e.name||e.id||"").trim().slice(0,80),type:e.type,required:e.required||e.getAttribute("aria-required")==="true"})).filter(f=>f.label));
const heading=((await p.locator("h1,h2").first().innerText().catch(()=>""))||"").trim().slice(0,80);
await p.screenshot({path:`evidence/${slug}.png`,fullPage:true});
const when=new Date().toISOString().slice(0,10);
const notes=`${when}, ${state?"logged-in":"logged-out"} session. ${step.join("; ")}. Page heading: "${heading}". Form fields seen: ${fields.map(f=>f.label+(f.required?" (required)":"")).join(", ")||"none (likely a login wall or the form did not open)"}. Nothing was filled in or submitted, so no app was created.`;
fs.writeFileSync(`evidence/${slug}.json`,JSON.stringify({tested:!!state&&fields.length>0,notes,fields,screenshot:`/evidence/${slug}.png`},null,2));
console.log(notes); await b.close();

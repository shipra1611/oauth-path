# OAuth Path
Look up an app, get a shareable guide to creating its OAuth app and getting it approved: difficulty, working time vs approval wait, blockers, steps, what an agent can do vs where the human takes over, and what is unverified.

**Live demo:** https://oauth-path.onrender.com

## Run
```
# free: key from https://aistudio.google.com/apikey
export GEMINI_API_KEY=...             # PowerShell: $env:GEMINI_API_KEY="..."  # or ANTHROPIC_API_KEY=sk-ant-... to use Claude instead
node server.mjs                       # Node 18+, zero dependencies
```
Open http://localhost:3000. Library: Slack, Google, Notion (hand-drafted seeds, partly verified) plus any guides generated live. Any other app runs the agent live (30 to 90 s); the result is saved to `guides/<slug>.json` and shared at `/g/<slug>`.
Setup attempts (optional): `npm i playwright && npx playwright install chromium`, log in once with `npx playwright codegen --save-storage=auth.json <console-url>`, then `node scripts/attempt.mjs <slug> <console-url> auth.json`. Output in `evidence/` overrides the guide's "what was tested" section.

## The problem, and why this scope
A **provider OAuth app** is the registration a developer creates with a service (Slack, HubSpot, Google...) that gives their product a client ID and secret, the redirect URLs, the scopes it may request, and the name users see on the consent screen. Their integration uses it to run the OAuth flow, and each of their end users then makes their own *connection* by approving it. Some platforms, such as Composio, can supply a *managed* OAuth app so a developer can skip registration. A developer still needs their own app when no managed one exists for a service, or when they want their own name on the consent screen, custom scopes, or their own rate-limit quota (per Composio's managed-auth docs). That is where the pain is: registration forms, review queues and plan restrictions that differ per provider.

So the guide leads with what a developer cannot easily see from docs: **how hard it is, how long it takes (working time vs approval wait), and what gates it**, then the steps, and then where an agent helps and where a human has to act. I chose depth and honesty over breadth: a few guides whose claims are checked against provider docs, plus a live agent that investigates any app. Every claim carries an evidence level (official docs, third-party source, or unverified), because a wrong "no review needed" costs a developer more than an empty field.

## Scaling to 100 apps
The library is plain JSON files, so scaling is a data task: run the same agent over a list of apps (paced for the key's rate limit), then spot-check each guide against its sources before publishing, as done in VERIFICATION.md. Verification is the bottleneck, not generation, so unreviewed guides are shown as drafts.

## Key decisions
- **Guide, not tutorial.** The developer's real question is "how long and what can block me", so difficulty, wait and blockers lead; steps follow.
- **Evidence per claim.** Fetched-page evidence only counts as `docs`. Blockers are tagged `docs` with the URL the agent retrieved, or `unverified`. The agent must say "not documented" instead of guessing wait times.
- **Agent vs human split** is its own section: approval forms, legal pages and payments cannot be delegated.
- **"Tested" is earned.** A guide says "setup attempted" only if `evidence/<slug>.json` shows fields observed. The attempt script never submits anything.
- **Zero-dependency server, JSON files as the library.** Guides are reviewable in git; 100 apps is a data problem, not an infra one.

## Limitations
- The agent searches, then fetches full doc pages (Anthropic web_fetch tool, beta header `web-fetch-2025-09-10`). If your account or model lacks that beta, remove the web_fetch entry in `agent.mjs` and it falls back to search only. It cannot read pages behind logins, JS-rendered consoles or PDFs it cannot parse.
- The attempt script records form fields from a console you are logged in to. Automatic app creation is not implemented; most providers need human identity or business verification.
- Seed guides are unchecked drafts until VERIFICATION.md is filled in. No provider approval was attempted.
- /api/generate has no auth or rate limiting. Cap your key budget before exposing it.

## Model providers
`agent.mjs` uses Claude if `ANTHROPIC_API_KEY` is set, else Gemini 3.8 Flash (free tier, rate limited) via Google Search grounding and URL context. Gemini cannot combine tools with JSON schema output, so it runs two passes: research, then structure. Evidence is enforced in code: a blocker stays `docs` only if its source host was actually retrieved in the research pass; otherwise it is downgraded to `unverified` and unretrieved sources are dropped. Free-tier quality is lower and rate limits (about 10 requests per minute) can cause retries.

## What I learned and corrected (full log in VERIFICATION.md)
The first live agent version produced confident but wrong guides. I checked them against the providers' own docs and changed the agent each time:
- **Linear:** the guide invented a "Developer URL" field (real field: `oauth.client_uri`). Fixed by making the agent use the docs' exact field names.
- **Calendly:** the guide reported a scope approval gate and "slow partner approvals". The quoted sentence was about user consent at install, and no provider page mentions partner approval. A plan-pricing claim came from a competitor's blog yet was labeled "docs". Fixed: evidence level is now decided in code from the source domain (`docs` only for the provider's own pages, otherwise `third-party source`), and the prompt forbids treating consent as a review gate.
- **HubSpot:** the guide said approval wait was "not documented". HubSpot documents a manual review (initial review within 10 business days, whole process no more than 60 days from feedback). The agent had read blogs, not the official listing page. Fixed: discovery now searches separately for creation, review and scopes pages, reads official pages first and allows at most two third-party pages.
- **Linear, second run:** the agent presented a workspace-admin feature (paid-plan app approvals) as a developer gate. Added a prompt rule separating developer gates from customer-side features.
- **Seed guides:** Notion's "public integrations need no review" was wrong per Notion's docs and was corrected; Slack's rate-limit claim was right but cited the wrong page and is now specific (1 request/min, 15 objects, apps created after 2025-05-29); Google's testing-mode and assessment claims were confirmed with their exceptions. Unchecked seed claims are marked unverified.

## More decisions made during the build
- **Three passes, evidence enforced in code.** Discover official docs, read them (only pages actually retrieved count as evidence), then structure. Sources are built in code from retrieved pages; the model cannot add one.
- **Requirements vs gates and waits.** Field validation is not the same as an approval wait; a developer asking "how long and what blocks me" needs the second list first.
- **Honest empties.** "No approval gate found in the docs read" is shown instead of invented blockers; unsupported items go to "still uncertain".
- **Free-tier operation.** Runs on a free Gemini key with request pacing and model fallback; the server caps live generations per IP and per day (`GEN_PER_IP_HOUR`, `GEN_PER_DAY`). Guides are cached on disk, so repeat lookups cost nothing.

## Limitations from the build (live agent and hosting)
- **No setup attempt was run.** Every guide says "No setup attempt". `scripts/attempt.mjs` exists but I did not run it, so nothing here was tested by actually creating an app.
- The agent depends on Gemini search and page reading; it can miss official pages (as it did for HubSpot at first), and cannot read pages behind logins or JavaScript-only consoles.
- The "official" label is a domain heuristic and can be wrong (for example `developers.google.com` when the query is "gmail").
- Only a small sample of claims in each guide was checked by hand. Guides created live are unverified drafts.
- The free-tier key limits live generation to a handful of apps per day; on the hosted demo, an unseen app may return a rate-limit message.
- Hosted on Render's free plan: cold start after inactivity, and generated guides are lost when the instance restarts unless committed to the repo.

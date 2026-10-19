# Verification log
Fill in by hand. Each row: a claim from a guide, what you checked it against, the outcome.
| Guide | Claim | Checked against | Result (confirmed / corrected / could not verify) | Date |
|---|---|---|---|---|
| slack | Non-Marketplace apps have reduced rate limits on conversations.history | docs.slack.dev/changelog/2025/05/29/rate-limit-changes-for-non-marketplace-apps | confirmed and made specific: 1 request/min, 15 objects/call, for commercially distributed apps created after 2025-05-29 or new installs; internal apps unaffected. Seed cited the wrong page; source fixed | 2026-10-20 |
| google | Restricted scopes need an annual third-party security assessment | developers.google.com/.../restricted-scope-verification | confirmed, with condition: apps that access data through a third-party server; assessor must be Google-approved | 2026-10-20 |
| google | Testing mode caps at 100 users, refresh tokens expire in 7 days | support.google.com/cloud/answer/15549945 | confirmed, with exception: 7-day expiry does not apply when only name, email and profile scopes are requested | 2026-10-20 |
| notion | Public integrations work without a review | developers.notion.com/docs/authorization | corrected: docs say the Authorization URL populates only after a public connection is submitted for review; criteria and timing not documented. Seed's other three Notion claims could not be confirmed on that page and were downgraded to unverified | 2026-10-20 |
Seed guides were drafted from memory of provider docs; four claims were checked on 2026-10-20 (rows above), the rest are marked unverified in the guides. No live setup attempt has been recorded for any app.

## Live-generated guides, checked 2026-10-19 (first agent version, before fixes)
| Guide | Claim | Checked against | Result | Date |
|---|---|---|---|---|
| linear | App name 2 to 80 chars, must not contain "Linear", "http://" or "https://" | linear.app/developers/oauth-app-manifests | confirmed | 2026-10-19 |
| linear | Callback URIs absolute HTTP(S), 1 to 32, unique | linear.app/developers/oauth-app-manifests | confirmed | 2026-10-19 |
| linear | Webhook URL must be HTTPS, not loopback, private-network or linear.app; resourceTypes needs 1+ value | linear.app/developers/oauth-app-manifests | confirmed | 2026-10-19 |
| linear | "Developer URL" is a required field | linear.app/developers/oauth-app-manifests | corrected: no such field; nearest is oauth.client_uri (homepage or docs URL) | 2026-10-19 |
| linear | Agents for other workspaces must be submitted to the integration directory; no review time stated | linear.app/developers/agents | confirmed (no timeline documented) | 2026-10-19 |
| calendly | "No API access until scopes are requested and approved" is a review gate | developer.calendly.com/docs/authentication/scopes, /creating-an-oauth-app | corrected: the sentence is about user consent at install, not a Calendly review; creating-an-app page describes no approval step | 2026-10-19 |
| calendly | "Partner approvals can be slow" | same pages | could not verify; no provider page mentions partner approval | 2026-10-19 |
| calendly | Webhooks need a Standard plan ($10/user/month) | cited a competitor blog (zeeg.me); Calendly scopes page lists no plan requirement | could not verify; evidence rule changed so third-party sources are labeled | 2026-10-19 |
| hubspot | Marketplace listing needs 3 active installs from unaffiliated accounts | developers.hubspot.com/docs/apps/developer-platform/list-apps/listing-your-app/app-marketplace-listing-requirements | confirmed (also: production accounts, activity in past 30 days) | 2026-10-19 |
| hubspot | App Certification needs 60 active installs | developers.hubspot.com/changelog/active-install-requirement-increase-for-app-certification | confirmed (raised from 6, effective 2024-05-15) | 2026-10-19 |
| hubspot | Access tokens last 30 minutes | developers.hubspot.com/changelog/upcoming-expiration-of-oauth-access-tokens-is-changing | confirmed (refresh tokens unaffected) | 2026-10-19 |
| hubspot | Review wait "not documented" | listing requirements page | corrected: manual review by the Ecosystem Quality team; initial review within 10 business days; whole process no more than 60 days from feedback. The agent had not read this page (it used third-party pages) | 2026-10-19 |
| hubspot | Authorization code valid 30 seconds | not found in pages read | could not verify | 2026-10-19 |
| linear (second run, fixed agent) | GraphQL limits: 5,000 requests/hour, 2,000,000 complexity points/hour, 10,000 per query for OAuth apps | linear.app/developers/rate-limiting | confirmed | 2026-10-19 |
| linear (second run) | Third-party app approvals are only on paid plans, shown as a gate and as a possible cost to the developer | linear.app/docs/third-party-application-approvals | corrected: feature for workspace admins on paid plans; not a developer gate | 2026-10-19 |
| linear (second run) | Webhook quotas of 30 per team and 50 per workspace | rate-limiting page (links to separate webhooks docs) | could not verify | 2026-10-19 |
| linear (second run) | New requirement and gate sections (field names, exact limits, official source labels) | manifests page, rate-limiting page | confirmed improvement over first run | 2026-10-19 |


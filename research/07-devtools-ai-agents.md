# 07 - Dev tools and AI agents: gaps worth $10-100/mo

Research date: 2026-10-08. Area: coding agents, MCP, agent security/sandboxing, LLM cost control, agent hosting, skills/config governance.

## Read this first: how reliable this report is

Tooling limits during this run, which shape how far you can trust it:

- **WebSearch budget ran out** partway through the run (the harness said the per-turn limit of 200 was shared across all agents). I got about 15 searches in. I could not run the MCP-observability, funding, or follow-up searches I planned.
- **WebFetch could not reach almost any site.** Reddit, Hacker News, Algolia, dev.to, Medium, The Register, Snyk, bex.co and most blogs failed DNS or proxy. Only github.com and docker.com pages loaded.
- **I never read a Reddit or HN thread directly.** There are no verbatim Reddit or HN quotes in this report. Where I cite a news or blog claim, it came from a search-engine summary of that URL. I did not open the page, so treat it as secondary and unverified.
- **The strongest evidence is GitHub issues and repos.** I read these directly through search or fetch: reaction counts, titles, states, quoted text. They show developer pain. They do not show willingness to pay.
- **I verified no pricing, revenue or MRR** for any competitor or analogous product. Price points below are my assumptions, labeled as such.

Pattern I did verify across many issues: **platform vendors close or absorb the most-upvoted asks quickly.** Examples: MCP tool filtering, tool search, resume, and mobile push notifications are all "closed". A bet on "Anthropic won't build this" needs evidence that it is open for months or marked "not planned". I use that test to rank.

Conventions: [V] = verified by me from a primary page. [S] = from a search-result summary, page not opened. [I] = my inference.

---

## 1. Ranked opportunities

### 1. Vendor-neutral secrets and credential broker for coding agents (headless, cloud, team)

**Problem.** Agents need API keys and cloud credentials, and every current option leaks them. Claude Code's sandbox can't stop reads of `~/.ssh` and `~/.aws`. Cloud sessions have no safe place for secrets at all.

**Evidence [V], GitHub issues on anthropics/claude-code:**
- #32733 "[FEATURE] Secure secrets injection for Claude Code on the web" has 178 thumbs-up (212 total reactions) and is still open, 7 months after it was filed on 2026-03-10. https://github.com/anthropics/claude-code/issues/32733
  - Quote: "Claude Code on the web (claude.ai/code) has no way to securely provide secrets to async cloud sessions."
  - Quote: the environment variables field "explicitly warns: 'don't add secrets or credentials.'"
  - Quote: "None of these are adequate."
- #84863 (2026-08-07, open): "Credential directories like `~/.ssh` and `~/.aws` are fully readable by any Bash command the agent runs, sandbox 'enabled' or not." The reporter says `~/.ssh/id_rsa` "was sent to the model API and persisted in plaintext in the local session transcript". It also says the agent can edit its own sandbox config. https://github.com/anthropics/claude-code/issues/84863
- Smaller related issues: #73582 "Store API credentials in the OS secret store instead of plaintext" (open, 7 reactions); #20966 "[HIGH PRIORITY] Claude exposes secrets/tokens in tool output - no redaction" (closed); #44868 "exposes secrets from .env ... despite CLAUDE.md prohibitions" (closed). The search that found these is on anthropics/claude-code.
- Docker published an rm -rf home-directory incident from a Reddit user. Docker sells the competing sandbox, so this is vendor framing. https://www.docker.com/blog/coding-agent-horror-stories-the-rm-rf-incident/ [V that the page says this; the incident itself is unverified]

**Who pays / how much.** Small dev teams and agencies running agents in cloud or CI. My assumption is $15-30 per seat per month, or $49-99 per team per month [I]. No price validated.

**Incumbents.** Free OSS sandboxes with host-side secret injection, all low-star: inoio/agents-sandbox (21 stars), pullrun (132 stars), sandy (7 stars). https://github.com/inoio/agents-sandbox , https://github.com/pullrun/pullrun . Docker Sandboxes (per Docker's blog). Cloud secret managers (1Password, Doppler, Vault) exist from my background knowledge; I did not check their agent features.

**Platform-absorption risk: HIGH.** Anthropic is the obvious owner of the cloud-session part. The wedge is to work across Claude Code, Codex and Cursor, and to add team audit.

**1-line MVP.** A local daemon plus proxy that holds secrets, injects them into outbound requests by host rule, denies agent reads of credential paths, and keeps an audit log; ships with a config for each major agent.

**Path to $10K MRR.** About 150 teams at $65 per month. Distribution is security-conscious dev communities. This is the hardest part and unproven.

**Exit potential.** Acquirer is a secrets or identity vendor (1Password, Doppler, Infisical, Docker). I have no comparable deal data. Likely low-to-mid six figures [I].

**Confidence: LOW-MEDIUM.** Pain is real and long-open. Willingness to pay and a defensible edge over free sandboxes are unproven.

---

### 2. Per-agent and per-project budget governor for production agents (Agent SDK, LangGraph, custom)

**Problem.** Production agent builders cannot cap spend per agent or per day. Existing caps are per-session or account-wide, and loops burn money.

**Evidence:**
- [V] claude-agent-sdk-python #653 "Running 4 Agent SDK Agents in Production", closed. The author runs 4 agents in Docker. Quotes: "We have zero visibility into per-call token usage." "Can't optimize what we can't measure." "with 4 agents running daily, we need per-agent daily/weekly caps." Per the issue text, `max_budget_usd` is per-session only. The issue was closed "not planned". https://github.com/anthropics/claude-agent-sdk-python/issues/653
- [V] Developers ask for session-level controls in Claude Code. #13354 "Continue when the session limit reached" has 209 thumbs-up and is open. https://github.com/anthropics/claude-code/issues/13354 . A related OpenAI Codex ask: openai/codex #34188 "Suspend and auto-resume at usage-limit reset" (open, 12 thumbs-up). https://github.com/openai/codex/issues/34188
- [S] Runaway-loop write-ups: one claims a $4,200 spend in 63 hours (https://bex.co/blog/2026/09/23/agent-burned-4200-spend-circuit-breakers ). Another cites an HN post claiming a $6,531.30 AWS bill from an agent (https://www.aibuilderclub.com/blog/ai-agent-runaway-cost ). Both are vendor blogs; I could not open them. Treat the dollar figures as unverified. A claim of a "$500M" enterprise bill is likely not credible.
- [V] The tooling space is full of tiny free libraries: loopbuster (84 stars), agent-guard (20 stars), agent-governor (18 stars). https://github.com/liuchunwei732-cmyk/loopbuster

**Who pays.** Startups and agencies with agents in production. Assumption $29-79 per month per team [I].

**Incumbents.** Gateways: LiteLLM, Portkey, Helicone (Mintlify acquisition claim is [S] from an aggregator, https://posthog.com/compare/best-helicone-alternatives ), OpenRouter. Anthropic Console per-key limits [S]. Free OSS libs above.

**Platform-absorption risk: MEDIUM.** Gateways already do budgets. Anthropic said "not planned" on per-agent caps, but a gateway vendor can add it in a sprint.

**1-line MVP.** A drop-in proxy (`ANTHROPIC_BASE_URL`) with per-agent/day hard caps, loop detection, and a Slack kill switch.

**Path to $10K MRR.** About 200 teams at $50. Needs a distribution hook, for example an open-source core plus hosted dashboard.

**Exit potential.** Acquirer is an observability or gateway vendor. Unknown value. These categories already consolidate (see Helicone claim).

**Confidence: LOW-MEDIUM.** The need is clear in the one real production report I read. The category is crowded by free tools and gateways.

---

### 3. Vendor-neutral team registry for skills, rules and MCP config, with audit and private sharing

**Problem.** Teams copy CLAUDE.md, AGENTS.md, skills and MCP configs by hand across Claude Code, Cursor, Codex and Copilot. There is no org-owned, versioned, reviewable source.

**Evidence:**
- [V] Cross-tool config demand: anthropics/claude-code #6235 "Feature Request: Support AGENTS.md" has 5,186 thumbs-up (6,685 total reactions) and is now closed. A newer #34235 asks for AGENTS.md as a native file; 113 thumbs-up, open. https://github.com/anthropics/claude-code/issues/6235 , https://github.com/anthropics/claude-code/issues/34235
- [V] #48322 "Team/Enterprise: shared routines (org-owned scheduled agents)", 65 thumbs-up, open, assigned to a maintainer. Quote: "If the creator leaves the team, those routines become inaccessible breaking workflows the rest of the team depends on." https://github.com/anthropics/claude-code/issues/48322
- [V] #39293 "Usage analytics for Organization Skills (Team Plan)" is closed, which shows Anthropic already ships org skills. https://github.com/anthropics/claude-code/issues/39293 (found in search; I did not open it).
- [V] Many tiny sync tools exist and none has traction: glooit (25 stars), agent-rules-sync (7), vibe-rules (5), beadle (4). https://github.com/nikuscs/glooit
- [S] Guides say teams fall back on PR-reviewed CLAUDE.md and hand-sync across tools. https://medium.com/@binu_thayamkery/claude-code-on-a-team-whats-shared-what-s-private-and-how-not-to-step-on-each-other-11ebcea8d01c (search summary only).

**Who pays.** 5-30 person engineering teams and agencies. Assumption $49-149 per team per month [I].

**Incumbents.** Anthropic org skills and plugin marketplaces; GitHub (repos + PR review). Free sync CLIs.

**Platform-absorption risk: MEDIUM-HIGH** for single-vendor features; **LOW** for cross-vendor neutrality, which no vendor is incentivized to build.

**Weak spot.** The free tiny tools having near-zero stars suggests individuals do not pay or care. Only teams might.

**1-line MVP.** A GitHub App that treats `.agents/` as the source of truth, generates CLAUDE.md / .cursor rules / Codex files, lints for skill bloat and secrets, and posts diffs on PRs.

**Path to $10K MRR.** About 100-150 teams at $79. Sold through GitHub Marketplace.

**Exit potential.** Acquirer is a dev-platform vendor. Value capped unless adoption is broad [I].

**Confidence: LOW.** The pain is real but the solution is a thin layer over git. Build interest is high, payer interest unproven.

---

### 4. "Make your SaaS MCP-ready": hosted remote MCP server with OAuth for small SaaS companies

**Problem.** Shipping a production remote MCP server with correct OAuth (DCR/CIMD, refresh, per-tool scopes) is hard, and client-side bugs make it worse. Small SaaS companies want an MCP presence without building auth.

**Evidence:**
- [V] Client-side OAuth pain on anthropics/claude-code, all with many reactions:
  - #5706 "Missing Token Refresh Mechanism for MCP Server Integrations" (69 total reactions)
  - #3273 "does not work with MCP servers that does not implement Dynamic Client Registration" (55)
  - #24317 "Frequent re-authentication required with multiple concurrent Claude Code sessions" (42)
  - #65036 (2026-06-03, open, 40): "Claude just doesn't call it automatically when the access token expires; it falls through to the 'needs reconnect' UI immediately." The reporter's workaround is a community bridge, mcp-stdio. https://github.com/anthropics/claude-code/issues/65036
- [V] Spec-level friction: modelcontextprotocol/modelcontextprotocol "Simplify Authorization" (#389) and the Okta DCR incompatibility (#695), both closed. https://github.com/modelcontextprotocol/modelcontextprotocol/issues/389
- [V] OSS auth proxies exist: sigbit/mcp-auth-proxy (179 stars), obot-platform/mcp-oauth-proxy (37). hyprmcp/mcp-gateway (92 stars) is **archived**. https://github.com/sigbit/mcp-auth-proxy , https://github.com/hyprmcp/mcp-gateway [I: the archive suggests an OSS gateway was not a business, but I do not know the reason]
- [S] Hosting and gateways: Smithery, Glama, Composio, MintMCP, with marketplace price tiers of roughly $9-$29 per month on aggregator pages that disagree. https://toolradar.com/compare/smithery-vs-composio-mcp

**Who pays.** SaaS companies with 10-500 customers. Assumption $49-199 per month per product [I].

**Incumbents.** Cloudflare (Workers MCP + OAuth provider), Smithery, Composio, Glama, plus identity vendors (Auth0, Stytch, WorkOS) from my background knowledge, not verified here.

**Platform-absorption risk: HIGH** from Cloudflare and identity vendors. The client bugs may also be fixed by Anthropic.

**1-line MVP.** Paste your OpenAPI spec; get a hosted, OAuth-fronted remote MCP server with per-tool scopes and call logs in 10 minutes.

**Path to $10K MRR.** About 100 SaaS customers at $99. Outbound to SaaS founders.

**Exit potential.** Acquirer is an API-management or identity company. Unknown.

**Confidence: LOW.** Real pain, but the buyer (a SaaS company) is a different persona from the complaining developer, and OpenAPI-to-MCP is a crowded wedge.

---

### 5. Quota-aware agent scheduler: auto-resume at limit reset, forecast, queue

**Problem.** Sessions halt mid-task at usage limits and developers restart by hand. Max-plan users also report quota drain and no visibility.

**Evidence:**
- [V] #13354 (above) - 209 thumbs-up, open since 2025-12-08. Quote: "the workflow now stops for a few hours, until the session limit disappears." Also "leaving a half-baked solution because the session limit was reached."
- [V] Drain complaints with high reactions: #19673 "You've hit your limit · While usage is still at 84%" (77); #38239 (61); #23706 "Opus 4.6 token consumption significantly higher than 4.5" (75 thumbs-up). A quote from #23706: "not even 12 hours and already at 20% weekly usage ON the $200 max plan". https://github.com/anthropics/claude-code/issues/23706
- [V] A free tracker is huge: xiufengsun/TokenTracker has 1,991 stars, covers 31 tools. https://github.com/xiufengsun/TokenTracker . This anchors price at $0 for pure tracking.
- [S] Press coverage of limit complaints. https://www.theregister.com/2026/01/05/claude_devs_usage_limits/ (search summary only).

**Who pays.** Heavy individual users. Assumption $5-12 per month [I]. Small money.

**Incumbents.** ccusage, TokenTracker, others (all free). Anthropic.

**Platform-absorption risk: HIGH.** It is a small feature for the vendor, and these asks recur in both Anthropic and OpenAI repos.

**Caveat.** Any "rotate across multiple accounts to dodge limits" idea may violate provider terms. I did not check the terms.

**1-line MVP.** A CLI wrapper that watches the limit message, sleeps until reset, resumes the same task, and notifies you.

**Path to $10K MRR.** About 1,000 users at $10. Unlikely from this alone.

**Exit potential.** Low. Feature, not company [I].

**Confidence: LOW.** Loud demand, nearly free alternatives, weak monetization.

---

### 6. Production hosting for Claude Agent SDK agents: per-user isolation and warm pools

**Problem.** Teams serving many users from Agent SDK agents hit slow cold starts, session mix-ups, and no portable sessions.

**Evidence [V], claude-agent-sdk-python:**
- #333 "Performance Issues with Server-side Multi-instance Deployment" (17 thumbs-up, open). Quote: "initialization process is extremely slow (20-30+ seconds ...)". Workarounds listed: "Creating instances on-demand: Too slow", "Keeping long-lived instances: Resource consumption becomes problematic", "One instance per session: Not scalable". https://github.com/anthropics/claude-agent-sdk-python/issues/333
- #264 "Portable session snapshots (export/import across machines)" (11, open); #432 "Cloud-Based Session Storage" (closed); #632 session confusion for multi-user servers (closed). https://github.com/anthropics/claude-agent-sdk-python/issues/264
- [V] The whole repo returned only 6 matches for this topic, so volume is low.

**Who pays.** Startups building on the SDK. Assumption $50-200 per month [I].

**Incumbents.** Anthropic "Managed Agents" (named in the title of issue #46629, so it exists; I did not read its docs), E2B, Daytona, Modal, Cloudflare (background knowledge, not verified here).

**Platform-absorption risk: VERY HIGH.**

**1-line MVP.** A hosted pool of pre-warmed SDK sandboxes with per-user session storage and a 3-line client.

**Path to $10K MRR.** About 100 customers at $100.

**Exit potential.** Unknown. Platform risk makes it hard to sell.

**Confidence: LOW.** Low pain volume in the sources I could reach.

---

### 7. Agent-skill and MCP supply-chain scanner as a CI app for small teams

**Problem.** Community skills and MCP servers contain malware and leaked credentials, and normal AppSec tools do not read SKILL.md.

**Evidence:**
- [S] ClawHavoc: Koi Security reported 341 malicious skills among 2,857 on ClawHub (11.9%) in Feb 2026; Snyk's ToxicSkills audit covered 3,984 skills (13.4% critical issues). Counts differ by source. https://snyk.io/articles/clawdhub-malicious-campaign-ai-agent-skills (search summary only; the page failed to load for me).
- [S] MCP CVEs: Cursor "DuneSlide" CVE-2026-50548/50549 rated 9.8; Windsurf CVE-2026-30615; nginx-ui MCP CVE-2026-33032; counts of "14" vs "30+" vs "40+" CVEs disagree. https://the-agent-report.com/2026/07/mcp-security-landscape-2026-vulnerabilities-mitigations/ (search summary only). Verify in NVD before quoting.
- [V] Free scanners abound: skillhawk (64 stars), skill-sentinel (17), razin (16), SkillsGuard (15). https://github.com/Berserk-hub150/skillhawk

**Who pays.** Mostly enterprises and security teams. Small-team willingness unknown.

**Incumbents.** Snyk (has published ToxicSkills research), plus many free OSS scanners.

**Platform-absorption risk: HIGH** (Snyk, GitHub, marketplaces will scan).

**Confidence: LOW.** Loud news, bad solo-founder economics: free competition and an enterprise buyer.

---

### 8. Multi-account profile and connector manager for AI tools (freelancers, consultants)

**Problem.** People hold work and personal Claude accounts and multiple GitHub/connector accounts, and switching means logging out.

**Evidence [V], anthropics/claude-code:**
- #18435 multi-account in Claude Desktop: 865 thumbs-up (1,042 total), open. Quote: "requires users to sign out and sign back in to switch between different Claude accounts." https://github.com/anthropics/claude-code/issues/18435
- #36151 multi-account on mobile: 750 thumbs-up (1,036 total), open.
- #27302 multiple connector accounts: 402 thumbs-up (570 total), open. Quote: "I cannot access repositories from my work account, and vice versa." https://github.com/anthropics/claude-code/issues/27302
- #20131 multi-account profile support (115) is closed, so part may have shipped. I did not check.

**Who pays.** Individuals. Assumption one-time $10-20 or $3-5 per month [I]. Too small.

**Platform-absorption risk: VERY HIGH.** These are first-party account features.

**Confidence: LOW.** The most-upvoted issues I found, but the wrong shape for a business, and likely a ToS-sensitive area.

---

### 9. Unified cross-tool session history and memory search

**Problem.** Resume is broken or limited, and history is split across Claude Code, Codex, Cursor.

**Evidence [V]:** #28745 "Allow resuming conversations from different directories" (80, closed); #26123 "/resume is broken ... since v2.1.31" (60, closed); #9258 history lost in VS Code plugin (51, open). https://github.com/anthropics/claude-code/issues/26123

**Platform-absorption risk: HIGH.** Most of these are already closed.

**Confidence: LOW.** Individual $5-10 per month utility.

---

### 10. MCP server observability and analytics for MCP authors

**Problem.** Authors of MCP servers cannot see tool-call usage and errors.

**Evidence [V]:** only small OSS projects: shinzo-ts (68 stars), argus (0). https://github.com/shinzo-labs/shinzo-ts . Low star counts suggest low demand [I]. I could not run the searches to find paid competitors.

**Confidence: VERY LOW.** Listed so you know I looked.

---

## 2. Rejected ideas and why

| Idea | Why rejected | Evidence |
|---|---|---|
| **MCP context-bloat / tool-filtering tools** | Platform absorbed it. Tool filtering (#7328, 225 thumbs-up), lazy loading (#7336, 109), and Tool Search/programmatic calling (#12836, 167) are all closed. I can't tell what shipped because the closing comments did not load. | https://github.com/anthropics/claude-code/issues/12836 , https://github.com/anthropics/claude-code/issues/7328 |
| **Mobile/phone approval for agents** | Anthropic ships Remote Control; push-notification request #29438 (59 thumbs-up) is closed. | https://github.com/anthropics/claude-code/issues/29438 |
| **Generic LLM observability and evals** | Crowded and consolidating: Langfuse, Helicone, Portkey, Braintrust, LangSmith, PostHog, Promptfoo are all named in search results; two of those are reported acquired [S] (single aggregator source). Small teams are told to start with a 30-50 case golden set plus Promptfoo in CI, i.e. a free path [S]. | https://posthog.com/compare/best-helicone-alternatives , https://dev.to/lamingsrb/llm-evals-in-2026-a-practitioners-field-guide-26if (search summary only) |
| **Claude Code usage dashboards** | Free anchors: TokenTracker 1,991 stars; ccusage; Anthropic's own Analytics API is free for Admin API orgs [S]. | https://github.com/xiufengsun/TokenTracker , https://platform.claude.com/docs/en/manage-claude/analytics-api.md |
| **MCP security gateways / firewalls** | Over a dozen OSS projects, nearly all under 50 stars apart from JanuScope (32); the category looks supply-heavy [I]. Commercial gateways already launched (MintMCP, Lasso, Bifrost, Runlayer per a vendor blog). | https://github.com/giancarloerra/JanuScope , https://www.mintmcp.com/blog/gateways-ai-startups-with-mcp |
| **MCP marketplace / directory** | Glama indexes ~37k servers (aggregator claim); Smithery, Composio, Apify exist. Winner-take-most. | https://toolradar.com/tools/glama |
| **Paid MCP servers / per-call billing** | Rails already exist (Cloudflare x402, Moesif, Polar, Apify). Open question whether agents will pay per call; a conference session says so explicitly. | https://developers.cloudflare.com/agents/x402/charge-for-mcp-tools/ , https://agntconmcpconjapan26.sched.com/event/2QlDO/what-happens-when-your-mcp-tools-cost-money-prakash-rao-aig-technologies-marco-gonzalez-red-hat (search summaries) |
| **Always-on Claude Code on a VPS** | Anthropic ships Remote Control and cloud sessions; VPS vendors (Bluehost etc.) push it already. Bugs I found are in a product the vendor is actively fixing. | https://www.productcompass.pm/p/claude-code-vps (search summary) |
| **Agent sandboxes** | At least 8 OSS microVM sandboxes plus Docker Sandboxes. | https://github.com/pullrun/pullrun , https://www.docker.com/blog/coding-agent-horror-stories-the-rm-rf-incident/ |
| **CLI-output token compressors** | Only one repo came back, with 46 stars; small niche, easy for the vendor to fix. | https://github.com/AgusRdz/chop |

---

## 3. What I could not verify

- **Any willingness to pay.** I found no price, MRR, or customer count for any product in these niches. GitHub reactions measure annoyance, not payment.
- **Reddit and Hacker News content.** No thread was read. Claims about "loud Reddit complaints" rest on press summaries (The Register, AOL, BBC via search results).
- **Dollar figures for runaway agents** ($4,200 in 63 hours; $6,531.30 AWS bill; "$500M"). Only seen in search summaries of vendor blogs. The $500M claim is likely not credible.
- **Security statistics.** CVE counts (14 / 30+ / 40+), "85% bypass" for Sentry MCP, "15k exposed servers", and the claim that every official MCP SDK has an unpatched RCE flaw that Anthropic calls "expected behavior" all came from secondary blogs. The last one had no corroboration.
- **ClawHavoc / ToxicSkills numbers.** Counts differ between Koi, Snyk, and Penligent; I could not open the originals.
- **Closure reasons** for the "absorbed" issues (#7328, #12836, #6915, #29438, #20131). The pages showed Closed but no comments. I infer shipping from the titles of later issues and from tool names, not from release notes.
- **Competitor pricing** (Smithery $10/$25, Glama $9-$80, Composio $0/$29/$229). Aggregator sites disagree; check vendor pages.
- **Helicone acquired by Mintlify; Portkey acquired by Palo Alto.** Each appears in a single aggregator source.
- **Cursor, Windsurf, Copilot, Codex pain.** Cursor's issue search returned zero relevant items and I had no access to the Cursor forum; Codex was sampled lightly. The report is Claude Code-heavy.
- **Anthropic's current Team/Enterprise managed settings, org skills, Managed Agents features.** I saw only references to them, not their docs.
- **Exit multiples.** I found no comparable acquisition prices; exit guesses are inference.

### Suggested next steps before building anything
1. Pre-sell test for #1-#3: landing page plus a $20 deposit or a "pay when ready" waitlist to 30 team leads.
2. Re-run the Reddit, HN and X searches on a machine that can reach them. Prioritize the ideas 1, 2 and 3 above.
3. Check Anthropic's release notes for what shipped against each closed issue.

# Findings: Building an MCP Server for Scoutbook / my.scouting.org

_Captured 2026-08-31. Everything below concerns the **unofficial**
`api.scouting.org` — the REST backend behind Scoutbook Plus / Internet
Advancement and my.scouting.org. Not affiliated with the BSA / Scouting
America; endpoints are undocumented and can change without notice._

## 1. Prior art

### The one real MCP server: `dlaporte/scoutbook-ai-test`
A working, deployable MCP server — despite the throwaway name, 0 stars, and no
README.

- **Stack:** Python 3.10+, **FastMCP 3.0**, `httpx`, Docker/`docker-compose`.
- **Tool generation:** `openapi_tools.py` reads `openapi.yaml` and registers
  **one MCP tool per endpoint** (108 tools), deriving args from path/query/body
  params and docstrings from the spec descriptions.
- **Auth:** A full 757-line **OAuth provider** (`bsa_oauth_provider.py`) that
  fronts the BSA login. The MCP client pops a browser login page; the server
  exchanges BSA credentials for a JWT, caches per-session auth in an
  **encrypted persistent store** (`store.py`, Fernet), and refreshes silently.
- **Posture:** Explicitly **read-only** in its server instructions, even though
  the spec includes write endpoints.
- **Maturity:** Real but unproven — no tests, no README, no releases, created
  2026-03-24, no external adoption.

**Takeaway:** the "does an OpenAPI→MCP auto-gen approach work for Scoutbook?"
question is already answered *yes* — mechanically. What's missing is curation,
docs, validation, and trust.

### Supporting projects
- **`mmarseglia/scouting-api`** (Apache-2.0, ~30★) — the most *maintained* doc
  effort. Small (6 paths) but **validated in CI against live responses** (Optic),
  with a Postman collection and clear auth docs. Best-quality-per-endpoint.
- **`natbros-git/scouts-cli`** (MIT) — a Python CLI wrapping the same API,
  **built for AI-agent consumption** (JSON-by-default, agent-oriented gotcha
  docs). Notable for solving auth pragmatically via **Playwright browser
  automation** + cookie persistence, and for exposing **write** paths (bulk
  advancement entry, messaging with confirmation dialogs).
- **`dlaporte/scoutbook-api`** — the original standalone OpenAPI spec repo,
  **now private/removed**. The `scoutbook-ai-test` embedded copy is what
  survives publicly.

## 2. Open-PR reconciliation (both projects)

Reviewed all open PRs so we build on the latest state, not stale `main`s.

- **`scoutbook-ai-test`:** no open PRs. The 108-path `main` spec is current.
- **`scoutbook-api`:** repo is private/removed — PRs not enumerable (403).
- **`mmarseglia/scouting-api`:** 3 open PRs —
  - **#16** (dependabot, super-linter) and **#14** (Snyk, `fs`) — CI/dependency
    noise, **no spec impact**.
  - **#9** (dlaporte, "updated OpenAPI spec", open since 2024-09-21) — the only
    substantive one: **33 paths, OpenAPI 3.1.0**, +573/−86, mergeable/clean.

### Is PR #9 already covered by the 108-path spec?
Almost entirely. Normalized path-set diff (108-path spec vs PR #9's 33):

- **25 of 33** PR #9 paths are already in the comprehensive spec.
- **8 paths are unique to PR #9** — and every one is a **`v2` variant** of an
  endpoint the big spec only documents in `v1` form:

  ```
  /persons/v2/{personGuid}/profile
  /persons/v2/{personGuid}/roleTypes
  /persons/v2/{personGuid}/subscriptions
  /persons/v2/{personGuid}/renewalRelationships
  /persons/v2/{personGuid}/tools
  /advancements/v2/youth/{userId}/leadershipPositionHistory
  /organizations/v2/{organizationGuid}/advancementsReadyToBeAwarded
  /organizations/v2/{organizationGuid}/orgTrainingSummary
  ```

**Action:** treat the 108-path spec as the base; **cherry-pick these 8 `v2`
variants** from `specs/reference/dlaporte-pr9.openapi.yaml`. `v2` endpoints on
this API generally return richer/cleaner payloads, so they're worth having
alongside (or instead of) the v1 forms. Nothing in the dependency PRs matters.

## 3. The API surface (what tools we'd expose)

Full breakdown in [`tool-surface.md`](./tool-surface.md). Summary — 108
operations, 13 categories, overwhelmingly **read** (only ~11 write endpoints):

| Category | Ops | Notes |
|---|---|---|
| Lookups | 24 | Static enums (ranks, genders, positions…) — cache aggressively |
| Advancement Catalog | 15 | Rank/MB/award/adventure defs + requirements |
| Membership & Renewal | 14 | Incl. writes: memberships, recharter validate |
| Discovery & Profile | 11 | Person profiles, roles, relationships, toolkits |
| Youth Progress | 9 | Per-youth ranks/MBs/awards/adventures + reqs |
| Organization Dashboards | 8 | Advancement/renewal/activity dashboards |
| Unit Roster | 8 | Youth/adult/parent rosters, key3; +2 org writes |
| Events & Calendar | 5 | |
| Commissioners | 4 | District-level unit health |
| Training & Compliance | 4 | YPT status; +training-record writes |
| Activities | 3 | Camping/hiking/service logs; +write |
| Bulk Advancement | 2 | `advancementHistory`, ready-to-award (writes) |
| Authentication | 1 | JWT login |

### Auth model (consistent across all projects)
`POST https://auth.scouting.org/api/users/{username}/authenticate` with a
form-encoded password → JWT bearer. The token carries `personGuid`,
`organizationGuid`, and `userId` claims that most other calls need as path
params. Tokens are short-lived (~7–8h). Two proven refresh strategies:
- **JWT re-auth** with stored credentials (mmarseglia, scoutbook-ai-test).
- **Browser cookie capture** via Playwright (scouts-cli) — avoids storing the
  password, survives some auth-hardening.

## 4. Recommendation: curate, don't ship the auto-gen as-is

**Start from `scoutbook-ai-test`'s spec + generator, but curate the tool set
by hand.** Reasons:

1. **108 flat tools is too many for an agent to wield well.** Lookups (24) and
   raw dashboards dilute tool selection. Curate to a task-shaped ~15–25:
   e.g. `get_unit_roster`, `get_youth_advancement`, `get_needs`,
   `list_merit_badges`, `record_advancement` — composing multiple endpoints
   behind one tool where it helps.
2. **Fold the lookups into resources or cached helpers**, not 24 tools.
3. **Read-first.** Ship the read surface; gate the ~11 writes behind explicit
   opt-in + confirmation (scouts-cli's pattern), since bad writes hit real
   youth records.
4. **Reuse the hard part.** `scoutbook-ai-test`'s OAuth provider + encrypted
   session store is the genuinely hard, already-solved piece — worth adopting
   (license permitting) or reimplementing.
5. **Borrow mmarseglia's validation discipline** (Optic against live responses)
   so spec drift is caught.

### Licensing gate before any public build
- `scoutbook-ai-test` (spec **and** OAuth code) is **all-rights-reserved** — do
  not lift it into a public project without permission or a clean-room redo.
- `mmarseglia/scouting-api` + PR #9 are **Apache-2.0** — safe with attribution.
- `scouts-cli` is **MIT** — safe with attribution.

A defensible path: **build the spec ourselves** (Apache-2.0 base + PR #9 `v2`
variants + our own capture of the endpoints we use), reference the all-rights
-reserved spec only as a checklist, and write our own auth layer.

## 5. Suggested next steps

1. Cherry-pick the 8 `v2` variants from PR #9 into a working spec.
2. Draft the curated ~15–25 tool list (task-shaped, read-first).
3. Prototype auth against `auth.scouting.org` with a throwaway account to
   confirm the JWT claims and token lifetime firsthand.
4. Decide license posture (clean-room spec vs. asking dlaporte for terms).

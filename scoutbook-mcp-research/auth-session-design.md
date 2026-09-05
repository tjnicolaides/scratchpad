# Auth & Session Layer Design

How the MCP server authenticates to `api.scouting.org` and manages sessions.
This is the genuinely hard part — the rest is spec-driven tool generation.
Grounded in what `dlaporte/scoutbook-ai-test` proved works, with changes noted.

## 1. What the BSA auth actually is

- **Login:** `POST https://auth.scouting.org/api/users/{username}/authenticate`
  with header `Accept: application/json; version=2` and a **JSON** body
  `{"password": "..."}`.
  ⚠ The OpenAPI spec says `application/x-www-form-urlencoded` — **the spec is
  wrong**; the working client sends JSON. Verify with `prototype/sb_probe.py`.
- **Response claims:** `token` (JWT bearer), `personGuid`, `account.userId`.
  Optional `expiresIn`/`expires_in`.
- **Token lifetime:** ~7–8h. **No refresh token exists** — BSA doesn't issue
  one, so the only renewal path is a **full re-login** with stored credentials.
- **Active unit:** not in the login response. Resolved with a second call:
  `GET /persons/{personGuid}/renewalRelationships`, taking the entry whose
  `relationshipTypeId` is null. (Users in multiple units need real selection —
  see §5.)
- **Every other call:** `Authorization: Bearer {token}`, plus a browser-like
  `User-Agent` (the API rejects some default agents).

Implication: because there's no refresh token, the server must either **hold
credentials** to re-login on expiry, or **push re-auth back to the user** every
~7h. That choice drives everything below.

## 2. Two credential strategies (pick per deployment)

| | **A. Stored-credential re-auth** | **B. Browser cookie capture** |
|---|---|---|
| Used by | scoutbook-ai-test, mmarseglia | scouts-cli |
| Mechanism | Keep username+password (or just password) server-side; re-POST to `/authenticate` on expiry | Drive a real browser (Playwright) login; persist session cookies; refresh token silently from cookies |
| Pro | Simple, headless, no browser dep | Never stores a raw password; survives some auth hardening (bot checks, MFA prompts) |
| Con | Stores a reusable secret; brittle if BSA adds MFA/CAPTCHA | Needs Chromium; heavier; per-user browser profile |
| Best for | A **hosted, multi-tenant** server behind OAuth | A **local, single-user** CLI/desktop client |

**Recommendation:** default to **A behind an OAuth front door** (below) for a
hosted server; offer **B** as the local-first option. Don't persist a raw
password in plaintext under either.

## 3. Recommended architecture (hosted, multi-tenant)

Front the BSA login with a standard **MCP OAuth provider** (FastMCP 3.0
`OAuthProvider`), exactly as scoutbook-ai-test does — the MCP client sees normal
OAuth; the provider brokers the BSA login behind an HTML form.

```
MCP client ──OAuth──> Server OAuth provider ──login form──> user enters BSA creds
                              │
                              ├─ POST auth.scouting.org/.../authenticate  → JWT
                              ├─ GET  renewalRelationships                → orgGuid
                              └─ mint MCP access token, map → BSA auth dict
MCP tool call (Bearer MCP-token) ─> resolve session ─> call api.scouting.org with JWT
```

Key properties to keep from the reference, and the fixes to make:

- **Per-session isolation.** Map each **MCP access token → its own BSA auth
  dict**. No shared/global auth. (reference: `_auth_sessions[mcp_token]`.)
- **Encrypted persistence.** Store sessions in a KV store with **Fernet
  encryption at rest** (`STORAGE_ENCRYPTION_KEY`). Never run prod without it.
- **Expiry with skew.** Treat a session as expired at `expiryTime <= now + 300`
  (5-min buffer) to avoid mid-call token death. (reference does this.)
- **No refresh grant.** `exchange_refresh_token` → `unsupported_grant_type`;
  expiry means re-auth. (reference does this — keep it, it's correct.)
- **TTL-bound storage.** Persist with TTL = token lifetime so expired sessions
  self-evict; add a periodic cleanup for the in-memory map.

### Fixes / improvements over the reference
1. **Don't use raw tokens as filenames.** The reference stores KV entries under
   filenames equal to the MCP token (values encrypted, names not) — an attacker
   with FS access can enumerate active tokens. **Hash the key** (e.g.
   `sha256(mcp_token)`) for the on-disk filename.
2. **Re-login needs credentials the reference doesn't persist.** scoutbook-ai
   -test stores only the *derived* JWT, so at expiry it *must* bounce the user
   back through the browser. If we want silent renewal (strategy A), we must
   persist the password **encrypted** — a real secret with real blast radius.
   Decide explicitly: **silent renewal (store secret)** vs **re-prompt every
   ~7h (store nothing reusable)**. Default to **re-prompt** unless a deployment
   opts into stored credentials.
3. **Cache GET responses** keyed by (path, params, session) with short TTLs;
   cache the 24 lookups with long TTLs. Cuts token pressure and latency.

## 4. Error taxonomy

Map upstream failures to stable, actionable tool errors:

| Upstream | Meaning | Tool behavior |
|---|---|---|
| `403` on authenticate | `LOGIN_FORBIDDEN` — bot/agent block or locked | Surface "login blocked; try browser strategy B / retry later" |
| `400/401` on authenticate | `LOGIN_UNAUTHORIZED` — bad creds | Ask user to re-enter credentials |
| `401` on API call | token expired mid-session | Auto re-auth once (strategy A) or prompt (B), then retry the call |
| `403` on API call | authz — user lacks role for that unit/endpoint | Return a clear "not permitted for this unit/role" |
| timeout / connect | network/upstream | Retry with backoff; then fail with a plain message |

## 5. Active-unit (multi-tenant) state

Leaders often belong to several units (a pack + a troop, or multiple dens).
`renewalRelationships` "first null-relationshipType" is a heuristic, not a
choice. Design:

- On login, fetch **`GET /persons/v2/{personGuid}/toolkits`** → the full list of
  units the user can act in.
- Hold a **selected `organizationGuid` as session state**; default to the
  `renewalRelationships` pick but let `get_my_context` / a `select_unit` tool
  change it.
- Tools take an optional `organizationGuid`; omitted → use session default.
  This keeps 90% of calls arg-free while supporting multi-unit users.

## 6. Security & privacy (non-negotiable — this is youth data)

- **Read-only by default.** Writes gated behind a flag + per-call confirmation
  (see `curated-tools.md` Phase 2).
- **No plaintext secrets at rest.** Password (if stored at all) and JWTs
  encrypted with a key from env/secret manager, never in the repo or image.
- **Hash storage keys** (see §3.1).
- **Minimize retention.** Persist only what's needed to keep a session; TTL it
  to token lifetime; provide `revoke`/logout that purges both memory and disk.
- **Scrub logs.** Never log the token or password; log a masked username at
  most (reference logs `user[:2]+"***"`).
- **PII in payloads.** Rosters carry minors' DOB, contact info, addresses.
  Don't cache these to durable storage; keep in-memory with short TTL; never
  send to third-party services.
- **Credential hygiene.** Prefer strategy B (no stored password) where the
  deployment allows a browser.

## 7. Open questions

1. **Silent renewal vs re-prompt** (§3.2) — the core policy call; determines
   whether we hold a reusable secret at all.
2. **MFA / bot-protection trajectory.** If BSA tightens auth (CAPTCHA/MFA),
   strategy A breaks and B becomes mandatory. Worth confirming current behavior
   with the live probe before committing.
3. **Token claims we can trust.** Does the JWT already contain
   `organizationGuid`/`userId` (letting us skip `renewalRelationships`)? The
   probe's `authenticate` output answers this.
4. **Rate limits.** Unknown; add conservative client-side backoff until observed.

## 8. Build checklist

- [ ] Confirm login shape + claims + token TTL via `prototype/sb_probe.py`
- [ ] OAuth provider brokering BSA login (adapt/clean-room from reference)
- [ ] Per-session store: **hashed** filenames, Fernet-encrypted values, TTL
- [ ] Expiry-with-skew + single auto-retry on 401
- [ ] `select_unit` + session-held active org
- [ ] Response cache (short TTL GETs, long TTL lookups)
- [ ] Error taxonomy mapped to tool errors
- [ ] Decide + implement renewal policy (silent vs re-prompt)

_See [`FINDINGS.md`](./FINDINGS.md) for prior-art context and
[`curated-tools.md`](./curated-tools.md) for the tool surface this auth layer
serves._

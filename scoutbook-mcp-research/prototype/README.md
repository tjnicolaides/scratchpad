# Live probe: `sb_probe.py`

A throwaway harness that validates the first five curated tools against the
**live** `api.scouting.org` — `authenticate` → org resolution →
`get_my_context` (toolkits) → `get_unit_roster` (youths) →
`get_youth_advancement` (ranks). Prints response **shapes only** — never the
token or password.

## Why it isn't run here

Claude Code's remote environment for this session has **egress restricted** to
Anthropic APIs + package registries. The proxy denies `CONNECT` to
`auth.scouting.org` (403 by policy), so the live call can't run from the cloud
sandbox. Run it locally, or recreate the environment with a network policy that
allows `*.scouting.org`.

## Run locally

```bash
export SB_USER='you@example.com'
export SB_PASS='...'          # your my.scouting.org password
python3 sb_probe.py
```

No third-party deps (stdlib `urllib`). Credentials are read from the
environment and never written to disk. What to confirm from the output:

- **`authenticate`** returns `token`, `personGuid`, and `account.userId`
  (the real request is JSON `{"password": ...}` with
  `Accept: application/json; version=2` — *not* the form-encoding the OpenAPI
  spec claims).
- **`renewalRelationships`** yields the `organizationGuid` (entry whose
  `relationshipTypeId` is null) — confirm this is a reliable way to pick the
  active unit.
- **`toolkits`** lists the units you can access.
- **roster `youths`** — note which id field each youth carries
  (`userId` vs `memberId` vs `personGuid`); this determines what
  `/advancements/v2/youth/{userId}/...` actually wants.
- **youth `ranks`** — confirms the advancement calls key off that id.

Report back the status codes + key names and we can lock down the tool
input/output contracts.

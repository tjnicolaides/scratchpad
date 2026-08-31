# Scoutbook / my.scouting.org MCP — Research

Working research on building an MCP server around the unofficial BSA
Scoutbook / Scouting.org API (`api.scouting.org`). Captures the prior art,
the API surface, and a build recommendation.

## Contents

| File | What it is |
|---|---|
| [`FINDINGS.md`](./FINDINGS.md) | The analysis: prior projects, PR reconciliation, build-vs-curate recommendation |
| [`tool-surface.md`](./tool-surface.md) | All 108 API operations grouped into 13 categories (the auto-generated tool surface) |
| [`PROVENANCE.md`](./PROVENANCE.md) | Where each vendored file came from, licenses, and caveats |
| [`specs/scoutbook.openapi.yaml`](./specs/scoutbook.openapi.yaml) | dlaporte's comprehensive spec — 108 paths, OpenAPI 3.0.3 (⚠ all-rights-reserved, see PROVENANCE) |
| [`specs/reference/mmarseglia-main.openapi.yaml`](./specs/reference/mmarseglia-main.openapi.yaml) | mmarseglia's validated spec — 6 paths, Apache-2.0 |
| [`specs/reference/dlaporte-pr9.openapi.yaml`](./specs/reference/dlaporte-pr9.openapi.yaml) | mmarseglia PR #9 (dlaporte) — 33 paths, OpenAPI 3.1.0, Apache-2.0 |

## TL;DR

- A working, read-only Scoutbook MCP server already exists as an experiment:
  **`dlaporte/scoutbook-ai-test`** (FastMCP 3.0, full OAuth, 108 auto-generated
  tools). Zero traction, no README, no announcement — but real code.
- Its 108-path OpenAPI spec is the most complete public map of the API and
  is a strong starting point.
- No open PRs matter except **mmarseglia #9** (dlaporte's spec update), whose
  content is ~95% subsumed by the 108-path spec; only ~8 `v2` endpoint
  variants are unique to it — cherry-pick those.
- Everything here is **unofficial** and unaffiliated with the BSA / Scouting
  America. Endpoints can change without notice.

_This is a private research scratchpad, not a released project._

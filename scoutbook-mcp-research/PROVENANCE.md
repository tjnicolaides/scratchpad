# Provenance & Licensing

Captured 2026-08-31. All sources are **unofficial** community projects, not
affiliated with, endorsed by, or supported by the Boy Scouts of America /
Scouting America.

## Vendored files

### `specs/scoutbook.openapi.yaml`
- **From:** `dlaporte/scoutbook-ai-test` (`openapi.yaml`, `main`), an
  auto-generated FastMCP server. Repo created 2026-03-24.
- **Spec:** OpenAPI 3.0.3, 108 paths / 108 operations, title
  "Scoutbook/Scouting.org API".
- **License:** ⚠ **None — no LICENSE file, so all rights reserved by default.**
  Vendored here for **private research reference only.** Do not redistribute
  or ship in a public/derived project without the author's permission or
  regenerating an equivalent spec independently.
- **Note:** This author previously published a standalone spec repo
  `dlaporte/scoutbook-api`, which is now **private/removed** (404 to
  anonymous access as of capture). This embedded copy is the surviving
  public version of that work.

### `specs/reference/mmarseglia-main.openapi.yaml`
- **From:** `mmarseglia/scouting-api` (`api.scouting.org/openapi.yaml`, `main`).
- **Spec:** 6 paths. Validated in CI against live responses via Optic; ships
  a Postman collection and auth docs.
- **License:** **Apache-2.0.** Safe to reuse with attribution.

### `specs/reference/dlaporte-pr9.openapi.yaml`
- **From:** `mmarseglia/scouting-api` **PR #9** ("updated OpenAPI spec"),
  head `dlaporte/scouting-api@5aae693`, open since 2024-09-21.
- **Spec:** OpenAPI 3.1.0, 33 paths (+573/−86 vs base). Mergeable/clean.
- **License:** **Apache-2.0** (contribution to an Apache-2.0 repo).

## Open PRs reviewed (both projects)

| Repo | PR | Author | Substance? |
|---|---|---|---|
| dlaporte/scoutbook-ai-test | — | — | No open PRs |
| dlaporte/scoutbook-api | — | — | Repo private/removed (403) — could not enumerate |
| mmarseglia/scouting-api | #16 | dependabot | No — super-linter action bump |
| mmarseglia/scouting-api | #14 | Snyk | No — `fs` npm package bump |
| mmarseglia/scouting-api | #9 | dlaporte | **Yes** — spec expansion, see FINDINGS |

## Working clones (not committed)

The upstream clones live under `../upstream/` and are gitignored:
`scoutbook-ai-test`, `scouting-api`, `dlaporte-scouting-api-fork`.

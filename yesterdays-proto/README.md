# Yesterdays — atproto prototype (walking skeleton)

User-owned georeferencing of historical photos on the AT Protocol. This is the
**Phase-0 skeleton** from the design doc: point + area guesses, written as
records to a PDS, indexed by a small AppView, clustered into a confidence
surface, drawn on a map. Sample photos, app-password auth (no OAuth yet).

Its only job is to prove the loop end to end:

```
click map → write georef record to PDS → poller indexes it → consensus API → pins on the map
```

## What's here

| Path | What it is |
| --- | --- |
| `index.html`, `src/` | Vanilla-TS + Vite SPA: MapLibre map, sample photos, guess UI |
| `netlify/functions/consensus.ts` | Read API — clusters + confidence for a photo |
| `netlify/functions/submit.ts` | Writes a guess to the test PDS (app-password spike) |
| `netlify/functions/poll.ts` | Manual ingest trigger (dev convenience) |
| `netlify/functions/poll-background.ts` | Scheduled ingest, every 2 min |
| `lib/` | Shared: consensus algorithm, poller, DB client, geo math |
| `db/schema.sql` | The one table |
| `scripts/seed-guess.ts` | Writes sample guesses so the map isn't empty |

The AppView is the only new operational piece. It holds **no** user data of
record — it's a rebuildable projection of what lives in PDSes.

## Prerequisites

- Node 20+
- Netlify CLI: `npm i -g netlify-cli`
- A **throwaway Bluesky account** for the spike (all guesses come from it until
  real OAuth lands).

## Setup

```bash
cd yesterdays-proto
npm install

# 1. Provision the database (Netlify DB = Postgres/Neon). Injects
#    NETLIFY_DATABASE_URL for `netlify dev` and deploys automatically.
netlify db init

# 2. Create the table.
psql "$(netlify env:get NETLIFY_DATABASE_URL)" -f db/schema.sql
#    (or paste db/schema.sql into the Neon SQL editor)

# 3. Secrets for the app-password spike.
cp .env.example .env
#    edit .env: ATP_HANDLE, ATP_APP_PASSWORD, SEED_HANDLES
```

Create the app password in the Bluesky app: **Settings → App Passwords**.
Set `SEED_HANDLES` to the same throwaway handle so the poller indexes its repo.

## Run it locally

```bash
netlify dev            # SPA + functions on http://localhost:8888
```

Then either seed sample data or place guesses by hand:

```bash
# option A — bulk sample data
npm run seed
curl http://localhost:8888/.netlify/functions/poll

# option B — click the map in the browser, Submit, then "Poll now"
```

Pick a photo, drop pins, hit **Poll now**, and clustered pins with a confidence
badge appear. A tight cluster of 3 reads HIGH; a lone pin reads LOW; two clusters
far apart read CONTESTED.

## Deploy

```bash
netlify deploy --build           # preview
netlify deploy --build --prod    # production
```

Set the same env vars in the Netlify UI (Site settings → Environment variables).
The scheduled poller runs automatically once deployed.

## What this skeleton deliberately is NOT

- **No OAuth.** One shared test account writes every guess. Real per-user OAuth
  needs a domain (client-metadata + redirect URIs) — a separate pass.
- **No PostGIS.** Point-only, plain lat/lng columns, clustering in JS. PostGIS +
  areas are Phase 1.
- **No Jetstream.** Ingest is polling a seed list. Switch to a Jetstream worker
  (one small always-on box) when you want to discover strangers — Phase 2.
- **Placeholder NSID.** `place.yesterdays.*` must become a domain you control
  before writing to production PDSes.

The lexicon spec (schema JSON + typed record shapes + NSID constants) is the
shared contract, kept in its own package: `../packages/lexicons`
(`@scratchpad/lexicons`). This prototype currently inlines the collection
strings; point it at the package when you wire real workspace deps.

See `../yesterdays-atproto.html` for the full design, consensus rationale, phased
plan, and open risks.

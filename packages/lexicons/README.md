# @scratchpad/lexicons

Canonical atproto **lexicon spec** for the Yesterdays georeferencing project —
the shared contract that every service (the prototype AppView, any future
indexer or client) reads from, so the schema lives in exactly one place.

## Contents

| Path | What |
| --- | --- |
| `lexicons/place.yesterdays.georef.json` | The contribution record: subject + point-or-circle location union |
| `lexicons/place.yesterdays.photo.json` | Optional photo enrichment record |
| `src/nsids.ts` | NSID + location-`$type` constants (`NSID`, `LOCATION_TYPE`) |
| `src/types.ts` | TypeScript mirror of the records (`GeorefRecord`, `PhotoRecord`, …) |

The JSON is the source of truth; `src/types.ts` is hand-kept in sync (small
enough not to need codegen yet).

## Use it

```ts
import { NSID, LOCATION_TYPE, type GeorefRecord } from "@scratchpad/lexicons";

const record: GeorefRecord = {
  $type: NSID.georef,
  subject: { archive: "sample", itemId: "rva-001" },
  location: { $type: LOCATION_TYPE.point, lat: "37.5407", lng: "-77.4360" },
  createdAt: new Date().toISOString(),
};
```

Raw schema JSON (e.g. to register the lexicon with tooling):

```ts
import georef from "@scratchpad/lexicons/georef.json" with { type: "json" };
```

## Build

```bash
nx build @scratchpad/lexicons
```

> **Placeholder NSID.** `place.yesterdays.*` must become a domain you control
> (reverse-DNS) before writing to production PDSes. Change it once, here.

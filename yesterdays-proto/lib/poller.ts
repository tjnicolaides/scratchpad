import { IdResolver } from "@atproto/identity";
import { NSID, LOCATION_TYPE } from "@scratchpad/lexicons";
import { sql } from "./db";

// The AppView's ingest side. Walk a seed list of handles, resolve each to its
// PDS, list the georef records, and upsert them. Idempotent on the record URI,
// so re-running is safe. This is the "poll known repos" model from the design —
// swap for a Jetstream subscription once you want to discover strangers.

const COLLECTION = NSID.georef;

export interface PollSummary {
  seeds: string[];
  indexed: number;
  errors: string[];
}

export async function runPoll(): Promise<PollSummary> {
  const seeds = (process.env.SEED_HANDLES ?? process.env.ATP_HANDLE ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const idr = new IdResolver();
  let indexed = 0;
  const errors: string[] = [];

  for (const handle of seeds) {
    try {
      const did = await idr.handle.resolve(handle);
      if (!did) throw new Error("handle did not resolve");
      const doc = await idr.did.resolve(did);
      const pds = getPdsEndpoint(doc);
      if (!pds) throw new Error("no PDS endpoint in DID doc");

      let cursor: string | undefined;
      do {
        const url = new URL(`${pds}/xrpc/com.atproto.repo.listRecords`);
        url.searchParams.set("repo", did);
        url.searchParams.set("collection", COLLECTION);
        url.searchParams.set("limit", "100");
        if (cursor) url.searchParams.set("cursor", cursor);

        const res = await fetch(url);
        if (!res.ok) throw new Error(`listRecords ${res.status}`);
        const data = (await res.json()) as { records?: RawRecord[]; cursor?: string };

        for (const rec of data.records ?? []) {
          if (await upsert(did, rec)) indexed++;
        }
        cursor = data.cursor;
      } while (cursor);
    } catch (e) {
      errors.push(`${handle}: ${(e as Error).message}`);
    }
  }

  return { seeds, indexed, errors };
}

interface RawRecord {
  uri: string;
  cid?: string;
  value?: Record<string, any>;
}

function getPdsEndpoint(doc: unknown): string | null {
  const services = (doc as { service?: { id: string; type: string; serviceEndpoint: string }[] })?.service ?? [];
  const svc = services.find(
    (s) => s.id.endsWith("#atproto_pds") || s.type === "AtprotoPersonalDataServer",
  );
  return svc?.serviceEndpoint ?? null;
}

async function upsert(did: string, rec: RawRecord): Promise<boolean> {
  const v = rec.value ?? {};
  const loc = (v.location ?? {}) as Record<string, any>;
  const subj = (v.subject ?? {}) as Record<string, any>;
  const isCircle = loc.$type === LOCATION_TYPE.circle;
  const lat = Number.parseFloat(loc.lat);
  const lng = Number.parseFloat(loc.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !subj.archive || !subj.itemId) {
    return false; // skip malformed records rather than poison the index
  }

  await sql`
    insert into georef
      (uri, cid, did, archive, item_id, loc_type, lat, lng, radius_m, bearing_deg, confidence, note, created_at)
    values (
      ${rec.uri}, ${rec.cid ?? null}, ${did}, ${subj.archive}, ${subj.itemId},
      ${isCircle ? "circle" : "point"}, ${lat}, ${lng},
      ${isCircle && loc.radiusMeters != null ? Math.round(loc.radiusMeters) : null},
      ${!isCircle && loc.bearingDeg != null ? Math.round(loc.bearingDeg) : null},
      ${v.confidence ?? null}, ${v.note ?? null}, ${v.createdAt ?? null}
    )
    on conflict (uri) do update set
      loc_type = excluded.loc_type,
      lat = excluded.lat, lng = excluded.lng,
      radius_m = excluded.radius_m, bearing_deg = excluded.bearing_deg,
      confidence = excluded.confidence, note = excluded.note,
      created_at = excluded.created_at
  `;
  return true;
}

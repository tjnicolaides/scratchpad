import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db";
import { computeConsensus, type Contribution } from "../../lib/consensus";

// GET /.netlify/functions/consensus?archive=sample&itemId=rva-001
// Returns the consensus for one photo plus the raw contributions (for drawing
// individual dots on the map).
export const handler: Handler = async (event) => {
  const archive = event.queryStringParameters?.archive;
  const itemId = event.queryStringParameters?.itemId;
  if (!archive || !itemId) {
    return { statusCode: 400, body: "archive and itemId query params are required" };
  }

  const rows = (await sql`
    select loc_type, lat, lng, radius_m, did
    from georef
    where archive = ${archive} and item_id = ${itemId}
  `) as { loc_type: "point" | "circle"; lat: number; lng: number; radius_m: number | null; did: string }[];

  const contributions: Contribution[] = rows.map((r) => ({
    loc_type: r.loc_type,
    lat: Number(r.lat),
    lng: Number(r.lng),
    radius_m: r.radius_m != null ? Number(r.radius_m) : null,
  }));

  const result = computeConsensus(contributions);

  return {
    statusCode: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
    body: JSON.stringify({ ...result, raw: contributions }),
  };
};

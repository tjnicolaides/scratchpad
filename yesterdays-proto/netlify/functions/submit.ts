import type { Handler } from "@netlify/functions";
import { AtpAgent } from "@atproto/api";

// POST /.netlify/functions/submit
// Body: { archive, itemId, lat, lng, radiusMeters?, note? }
//
// SPIKE ONLY: writes the record to a single shared test account using an app
// password held server-side. This proves the write -> index -> read loop before
// real per-user OAuth exists. Every guess comes from one DID until then.
export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "POST only" };
  }
  const { ATP_HANDLE, ATP_APP_PASSWORD, PDS_SERVICE } = process.env;
  if (!ATP_HANDLE || !ATP_APP_PASSWORD) {
    return { statusCode: 500, body: "ATP_HANDLE / ATP_APP_PASSWORD not configured" };
  }

  let body: {
    archive?: string; itemId?: string;
    lat?: number; lng?: number; radiusMeters?: number; note?: string;
  };
  try {
    body = JSON.parse(event.body ?? "{}");
  } catch {
    return { statusCode: 400, body: "invalid JSON" };
  }
  const { archive, itemId, lat, lng, radiusMeters, note } = body;
  if (!archive || !itemId || typeof lat !== "number" || typeof lng !== "number") {
    return { statusCode: 400, body: "archive, itemId, lat, lng are required" };
  }

  const agent = new AtpAgent({ service: PDS_SERVICE ?? "https://bsky.social" });
  await agent.login({ identifier: ATP_HANDLE, password: ATP_APP_PASSWORD });

  const location =
    typeof radiusMeters === "number"
      ? {
          $type: "place.yesterdays.georef#circle",
          lat: String(lat),
          lng: String(lng),
          radiusMeters: Math.round(radiusMeters),
        }
      : {
          $type: "place.yesterdays.georef#point",
          lat: String(lat),
          lng: String(lng),
        };

  const record = {
    $type: "place.yesterdays.georef",
    subject: { archive, itemId },
    location,
    ...(note ? { note: String(note).slice(0, 300) } : {}),
    createdAt: new Date().toISOString(),
  };

  const res = await agent.com.atproto.repo.createRecord({
    repo: agent.session!.did,
    collection: "place.yesterdays.georef",
    record,
  });

  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ uri: res.data.uri, cid: res.data.cid }),
  };
};

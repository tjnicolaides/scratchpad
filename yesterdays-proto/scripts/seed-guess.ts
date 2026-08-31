import { AtpAgent } from "@atproto/api";
import { NSID, LOCATION_TYPE, type GeorefRecord } from "@scratchpad/lexicons";

// Writes a handful of sample guesses so the map shows something without manual
// clicking: a tight cluster of 3 points, one outlier, and one area circle for
// the 'sample/rva-001' photo. Run:  npm run seed
// Then trigger indexing:  curl http://localhost:8888/.netlify/functions/poll

const { ATP_HANDLE, ATP_APP_PASSWORD, PDS_SERVICE } = process.env;
if (!ATP_HANDLE || !ATP_APP_PASSWORD) {
  throw new Error("Set ATP_HANDLE and ATP_APP_PASSWORD in .env first.");
}

const agent = new AtpAgent({ service: PDS_SERVICE ?? "https://bsky.social" });
await agent.login({ identifier: ATP_HANDLE, password: ATP_APP_PASSWORD });

const archive = "sample";
const itemId = "rva-001";

const points = [
  { lat: 37.5407, lng: -77.436 },
  { lat: 37.5409, lng: -77.4363 },
  { lat: 37.5405, lng: -77.4358 },
  { lat: 37.545, lng: -77.43 }, // outlier
];

async function write(record: GeorefRecord) {
  const res = await agent.com.atproto.repo.createRecord({
    repo: agent.session!.did,
    collection: NSID.georef,
    record,
  });
  console.log("wrote", res.data.uri);
}

for (const p of points) {
  await write({
    $type: NSID.georef,
    subject: { archive, itemId },
    location: { $type: LOCATION_TYPE.point, lat: String(p.lat), lng: String(p.lng) },
    createdAt: new Date().toISOString(),
  });
}

await write({
  $type: NSID.georef,
  subject: { archive, itemId },
  location: {
    $type: LOCATION_TYPE.circle,
    lat: "37.5408",
    lng: "-77.4361",
    radiusMeters: 200,
  },
  createdAt: new Date().toISOString(),
});

console.log(`\nSeeded ${points.length + 1} guesses for ${archive}/${itemId}.`);
console.log("Now index them: curl http://localhost:8888/.netlify/functions/poll");

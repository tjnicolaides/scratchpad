const BASE = "/.netlify/functions";

export interface Cluster {
  lat: number;
  lng: number;
  points: number;
  areaSupport: number;
  spreadM: number;
  score: number;
}
export interface RawContribution {
  loc_type: "point" | "circle";
  lat: number;
  lng: number;
  radius_m: number | null;
}
export interface ConsensusResponse {
  count: number;
  clusters: Cluster[];
  best: Cluster | null;
  confidence: "high" | "medium" | "low" | "contested" | "none";
  raw: RawContribution[];
}

export async function getConsensus(archive: string, itemId: string): Promise<ConsensusResponse> {
  const r = await fetch(
    `${BASE}/consensus?archive=${encodeURIComponent(archive)}&itemId=${encodeURIComponent(itemId)}`,
  );
  if (!r.ok) throw new Error(`consensus ${r.status}`);
  return r.json();
}

export async function submitGuess(g: {
  archive: string;
  itemId: string;
  lat: number;
  lng: number;
  radiusMeters?: number;
  note?: string;
}): Promise<{ uri: string }> {
  const r = await fetch(`${BASE}/submit`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(g),
  });
  if (!r.ok) throw new Error(`submit ${r.status}: ${await r.text()}`);
  return r.json();
}

export async function pollNow(): Promise<{ indexed: number; errors: string[] }> {
  const r = await fetch(`${BASE}/poll`);
  if (!r.ok) throw new Error(`poll ${r.status}`);
  return r.json();
}

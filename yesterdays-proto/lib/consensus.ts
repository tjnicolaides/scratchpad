import { haversineMeters, centroid } from "./geo";

// Deliberately NOT a kernel-density surface. Cluster the points, fold circles in
// as soft support, score, pick the top, and flag a genuine second cluster as
// contested. Everything here is arithmetic you can explain to a contributor.

export type LocType = "point" | "circle";

export interface Contribution {
  loc_type: LocType;
  lat: number;
  lng: number;
  radius_m: number | null;
}

export interface Cluster {
  lat: number;
  lng: number;
  points: number;
  areaSupport: number;
  spreadM: number;
  score: number;
}

export type Confidence = "high" | "medium" | "low" | "contested" | "none";

export interface ConsensusResult {
  count: number;
  clusters: Cluster[];
  best: Cluster | null;
  confidence: Confidence;
}

const CLUSTER_RADIUS_M = 75; // placeholder — tune against real data (see risk R6)
const CONTEST_RATIO = 0.6; // a rival within 60% of the top score = contested

export function computeConsensus(rows: Contribution[]): ConsensusResult {
  const points = rows.filter((r) => r.loc_type === "point");
  const circles = rows.filter((r) => r.loc_type === "circle" && r.radius_m != null);
  const count = rows.length;

  // Greedy single-link clustering: attach each point to the first cluster whose
  // centroid is within threshold, else start a new one.
  const clusters: Contribution[][] = [];
  for (const p of points) {
    let placed = false;
    for (const c of clusters) {
      const cen = centroid(c);
      if (haversineMeters(p.lat, p.lng, cen.lat, cen.lng) <= CLUSTER_RADIUS_M) {
        c.push(p);
        placed = true;
        break;
      }
    }
    if (!placed) clusters.push([p]);
  }

  const scored: Cluster[] = clusters
    .map((members) => {
      const cen = centroid(members);
      const spread =
        members.length > 1
          ? Math.max(...members.map((m) => haversineMeters(m.lat, m.lng, cen.lat, cen.lng)))
          : 0;
      // A circle boosts a cluster whose centroid falls inside it; tighter
      // circles count for more (a 3km "roughly here" barely nudges the score).
      let areaSupport = 0;
      for (const a of circles) {
        const d = haversineMeters(cen.lat, cen.lng, a.lat, a.lng);
        if (d <= (a.radius_m as number)) {
          areaSupport += Math.min(1, 500 / (a.radius_m as number));
        }
      }
      const spreadPenalty = 1 / (1 + spread / CLUSTER_RADIUS_M);
      const score = (members.length + areaSupport) * spreadPenalty;
      return {
        lat: cen.lat,
        lng: cen.lng,
        points: members.length,
        areaSupport: round2(areaSupport),
        spreadM: Math.round(spread),
        score: round2(score),
      };
    })
    .sort((a, b) => b.score - a.score);

  // No point clusters: fall back to areas only (low), or nothing.
  if (scored.length === 0) {
    if (circles.length > 0) {
      const cen = centroid(circles);
      return {
        count,
        clusters: [],
        best: { lat: cen.lat, lng: cen.lng, points: 0, areaSupport: circles.length, spreadM: 0, score: 0 },
        confidence: "low",
      };
    }
    return { count, clusters: [], best: null, confidence: "none" };
  }

  const best = scored[0]!;
  const second = scored[1];
  const contested =
    !!second &&
    second.score >= CONTEST_RATIO * best.score &&
    haversineMeters(best.lat, best.lng, second.lat, second.lng) > CLUSTER_RADIUS_M * 2;

  let confidence: Confidence;
  if (contested) {
    confidence = "contested";
  } else if (best.points >= 3 || best.points + Math.round(best.areaSupport) >= 3) {
    confidence = "high";
  } else if (best.points === 2 || (best.points >= 1 && best.areaSupport > 0)) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  return { count, clusters: scored, best, confidence };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Great-circle distance in meters between two WGS84 points. */
export function haversineMeters(
  lat1: number, lng1: number, lat2: number, lng2: number,
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function centroid(pts: { lat: number; lng: number }[]): { lat: number; lng: number } {
  // Fine at city scale; revisit with a projected mean if you ever go global.
  const n = pts.length || 1;
  return {
    lat: pts.reduce((s, p) => s + p.lat, 0) / n,
    lng: pts.reduce((s, p) => s + p.lng, 0) / n,
  };
}

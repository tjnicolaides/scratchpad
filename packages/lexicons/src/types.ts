// TypeScript mirror of the lexicon JSON in ../lexicons. Hand-kept in sync with
// the schema files (small enough not to warrant codegen yet). lat/lng are
// strings in decimal degrees — lexicon has no float type.

import type { LOCATION_TYPE, NSID } from "./nsids.js";

export interface Subject {
  archive: string;
  itemId: string;
  iiifManifest?: string;
  sourceUrl?: string;
}

export interface PointLocation {
  $type: typeof LOCATION_TYPE.point;
  lat: string;
  lng: string;
  bearingDeg?: number;
}

export interface CircleLocation {
  $type: typeof LOCATION_TYPE.circle;
  lat: string;
  lng: string;
  radiusMeters: number;
}

export type Location = PointLocation | CircleLocation;

/** A record of type `place.yesterdays.georef`. */
export interface GeorefRecord {
  $type: typeof NSID.georef;
  subject: Subject;
  location: Location;
  confidence?: "sure" | "guess";
  note?: string;
  createdAt: string;
}

/** A record of type `place.yesterdays.photo` (optional enrichment). */
export interface PhotoRecord {
  $type: typeof NSID.photo;
  subject: Subject;
  title?: string;
  dateText?: string;
  yearStart?: number;
  yearEnd?: number;
  description?: string;
  tags?: string[];
  createdAt: string;
}

export function isCircle(loc: Location): loc is CircleLocation {
  return loc.$type.endsWith("#circle");
}

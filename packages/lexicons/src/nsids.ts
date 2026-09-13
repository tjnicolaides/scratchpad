// Namespace IDs for the Yesterdays lexicon. `place.yesterdays` is a PLACEHOLDER
// — replace it with a domain you control (reverse-DNS) before writing to
// production PDSes. Keep this file the single source for the strings; import
// from here instead of hardcoding NSIDs in each service.

export const NSID = {
  georef: "place.yesterdays.georef",
  photo: "place.yesterdays.photo",
} as const;

/** The `$type` values for the location union members inside a georef record. */
export const LOCATION_TYPE = {
  point: "place.yesterdays.georef#point",
  circle: "place.yesterdays.georef#circle",
} as const;

export type Nsid = (typeof NSID)[keyof typeof NSID];
export type LocationType = (typeof LOCATION_TYPE)[keyof typeof LOCATION_TYPE];

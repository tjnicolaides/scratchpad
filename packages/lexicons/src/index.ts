// @scratchpad/lexicons — canonical spec for the Yesterdays atproto lexicon.
//
// Raw schema JSON is the source of truth (./lexicons/*.json, also reachable via
// the package subpath exports "@scratchpad/lexicons/georef.json" and
// "/photo.json"). This module re-exports the NSID constants and the TypeScript
// record shapes so services share one typed contract.

export { NSID, LOCATION_TYPE } from "./nsids.js";
export type { Nsid, LocationType } from "./nsids.js";
export type {
  Subject,
  PointLocation,
  CircleLocation,
  Location,
  GeorefRecord,
  PhotoRecord,
} from "./types.js";
export { isCircle } from "./types.js";

import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./style.css";
import { PHOTOS, type Photo } from "./photos";
import { getConsensus, submitGuess, pollNow } from "./api";

// Free raster basemap — no API token needed.
const OSM_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: "raster" as const,
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster" as const, source: "osm" }],
};

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const map = new maplibregl.Map({
  container: "map",
  style: OSM_STYLE,
  center: [-77.436, 37.5407],
  zoom: 13,
});

let current: Photo | null = null;
let pending: { lat: number; lng: number } | null = null;
let pendingMarker: maplibregl.Marker | null = null;
let resultMarkers: maplibregl.Marker[] = [];

// --- photo list ---
const list = $("photos");
for (const p of PHOTOS) {
  const li = document.createElement("li");
  li.textContent = p.title;
  li.addEventListener("click", () => selectPhoto(p));
  list.appendChild(li);
}

function selectPhoto(p: Photo) {
  current = p;
  $("panel").hidden = false;
  ($("photo-img") as HTMLImageElement).src = p.imageUrl;
  $("photo-title").textContent = p.title;
  clearPending();
  setStatus("");
  map.flyTo({ center: p.center, zoom: 14 });
  void refresh();
}

// --- placing a guess ---
map.on("click", (e) => {
  if (!current) return;
  pending = { lat: e.lngLat.lat, lng: e.lngLat.lng };
  pendingMarker?.remove();
  pendingMarker = new maplibregl.Marker({ color: "#c1442c", draggable: true })
    .setLngLat(e.lngLat)
    .addTo(map);
  pendingMarker.on("dragend", () => {
    const ll = pendingMarker!.getLngLat();
    pending = { lat: ll.lat, lng: ll.lng };
  });
  ($("submit") as HTMLButtonElement).disabled = false;
});

$("area-mode").addEventListener("change", (e) => {
  $("radius-wrap").hidden = !(e.target as HTMLInputElement).checked;
});

$("submit").addEventListener("click", async () => {
  if (!current || !pending) return;
  const area = ($("area-mode") as HTMLInputElement).checked;
  const radius = Number.parseInt(($("radius") as HTMLInputElement).value || "300", 10);
  const note = ($("note") as HTMLInputElement).value.trim();
  setStatus("Writing record to PDS…");
  try {
    const res = await submitGuess({
      archive: current.archive,
      itemId: current.itemId,
      lat: pending.lat,
      lng: pending.lng,
      ...(area ? { radiusMeters: radius } : {}),
      ...(note ? { note } : {}),
    });
    setStatus(`Wrote ${res.uri}. Click “Poll now” to index it.`);
    clearPending();
  } catch (err) {
    setStatus("Error: " + (err as Error).message);
  }
});

$("pollnow").addEventListener("click", async () => {
  setStatus("Polling PDSes…");
  try {
    const s = await pollNow();
    setStatus(`Indexed ${s.indexed} record(s)${s.errors.length ? "; " + s.errors.join(", ") : ""}`);
    void refresh();
  } catch (err) {
    setStatus("Poll error: " + (err as Error).message);
  }
});

function clearPending() {
  pendingMarker?.remove();
  pendingMarker = null;
  pending = null;
  ($("submit") as HTMLButtonElement).disabled = true;
}

function setStatus(t: string) {
  $("status").textContent = t;
}

// --- render consensus ---
async function refresh() {
  if (!current) return;
  for (const m of resultMarkers) m.remove();
  resultMarkers = [];

  let data;
  try {
    data = await getConsensus(current.archive, current.itemId);
  } catch {
    return; // DB not set up yet, etc. — leave the map clean.
  }

  $("consensus").innerHTML = `<div class="conf conf-${data.confidence}">${data.count} guess(es) · ${data.confidence.toUpperCase()}</div>`;

  for (const r of data.raw) {
    const el = document.createElement("div");
    el.className = "dot " + (r.loc_type === "circle" ? "dot-area" : "dot-point");
    resultMarkers.push(new maplibregl.Marker({ element: el }).setLngLat([r.lng, r.lat]).addTo(map));
  }

  for (const c of data.clusters) {
    const isBest = !!data.best && c.lat === data.best.lat && c.lng === data.best.lng;
    const el = document.createElement("div");
    el.className = "cluster" + (isBest ? ` best conf-${data.confidence}` : "");
    el.textContent = String(c.points);
    resultMarkers.push(new maplibregl.Marker({ element: el }).setLngLat([c.lng, c.lat]).addTo(map));
  }
}

export interface Photo {
  archive: string;
  itemId: string;
  title: string;
  imageUrl: string;
  center: [number, number]; // [lng, lat] for MapLibre
}

// Sample stand-ins. picsum images are placeholders for real IIIF sources; the
// "true" location is arbitrary, so guesses are just for exercising the loop.
// Centered on Richmond, VA to honour the original Yesterdays.
export const PHOTOS: Photo[] = [
  {
    archive: "sample",
    itemId: "rva-001",
    title: "Main Street, looking east (sample)",
    imageUrl: "https://picsum.photos/seed/rva-001/640/440",
    center: [-77.436, 37.5407],
  },
  {
    archive: "sample",
    itemId: "rva-002",
    title: "Canal turning basin (sample)",
    imageUrl: "https://picsum.photos/seed/rva-002/640/440",
    center: [-77.44, 37.533],
  },
  {
    archive: "sample",
    itemId: "rva-003",
    title: "Broad Street streetcar (sample)",
    imageUrl: "https://picsum.photos/seed/rva-003/640/440",
    center: [-77.433, 37.548],
  },
];

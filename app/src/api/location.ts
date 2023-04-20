import { LatLng } from "@/api/index";
import { MAPTILER_KEY } from "@env";
import { BoundingBox } from "@/api/geo";

export const DEFAULT_TLS = {
  lat: 43.602173,
  lng: 1.445083
};

export const FR_BBOX: BoundingBox = {
  from: { lat: 41.172856, lng: -5.818786 },
  to: { lat: 51.577228, lng: 10.331117 }
};

const MapStyleUrl = "https://api.maptiler.com/maps/bright-v2/style.json?key=" + MAPTILER_KEY;
const MapStyle = JSON.stringify({
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: '<a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
      maxzoom: 17
    }
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm"
    }
  ]
});
export const MapStyleProps = MAPTILER_KEY ? { styleURL: MapStyleUrl } : { styleJSON: MapStyle };

export async function getLastKnownLocation(): Promise<LatLng> {
  /* try {
       const lastKnown = await Location.getLastKnownPositionAsync();
       if (!lastKnown) {
         return DEFAULT_BLAJOUX;
       }
       return {
         lat: lastKnown.coords.latitude,
         lng: lastKnown.coords.longitude
       };
     } catch (_) {
       return DEFAULT_BLAJOUX;
     } */
  return DEFAULT_TLS;
}

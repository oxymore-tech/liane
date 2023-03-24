import { LatLng } from "@/api/index";
import { MAPTILER_KEY } from "@env";

const DEFAULT_BLAJOUX = {
  lat: 44.3593807,
  lng: 3.4336323
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
  return DEFAULT_BLAJOUX;
}

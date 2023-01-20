import { LatLng } from "@/api/index";

const DEFAULT_BLAJOUX = {
  lat: 44.3593807,
  lng: 3.4336323
};

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

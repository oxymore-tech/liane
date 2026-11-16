import type { GestureInput } from "@/api/types";

const POSITION_TIMEOUT_MS = 10_000;

type PositionPart = Pick<GestureInput, "position" | "position_status">;

/**
 * Demande une position ponctuelle au navigateur, au moment d'un geste et seulement là.
 * Ne bloque jamais : sans accord ou sans signal, le geste part sans position.
 */
export const askPosition = (): Promise<PositionPart> =>
  new Promise((resolve) => {
    if (!("geolocation" in navigator)) {
      resolve({ position_status: "Unavailable" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({
          position: {
            lat: coords.latitude,
            lng: coords.longitude,
            accuracy_meters: coords.accuracy,
          },
        }),
      (error) =>
        resolve({
          position_status:
            error.code === error.PERMISSION_DENIED ? "Denied" : "Unavailable",
        }),
      {
        enableHighAccuracy: true,
        timeout: POSITION_TIMEOUT_MS,
        maximumAge: 0,
      },
    );
  });

import { LatLng, RallyingPoint } from "./api";
import { AppStorage } from "./storage";
import { AppEnv } from "./env";
import { Feature, Geometry, Point } from "geojson";
import { BoundingBox } from "./geo";

export type SearchedLocation = RallyingPointSearchedLocation | SearchedLocationSuggestion;
export type RallyingPointSearchedLocation = Feature<Point, RallyingPoint> & { place_type: ["rallying_point"] };
export type SearchedLocationSuggestion = {
  place_type_name: string[] | undefined;
  place_name: string;
  place_type: string[];
  context: Array<{ text: string }>;
} & Feature<Geometry, { ref: string; categories: string[] }>;

export function isRallyingPointSearchedLocation(item: SearchedLocation): item is RallyingPointSearchedLocation {
  return item.place_type[0] === "rallying_point";
}

export function asSearchedLocation(rp: RallyingPoint): SearchedLocation {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [rp.location.lng, rp.location.lat] },
    properties: { ...rp },
    place_type: ["rallying_point"]
  };
}

export interface LocationService {
  currentLocation(): Promise<LatLng>;
  getLastKnownLocation(): LatLng;
  cacheRecentLocation(rallyingPoint: RallyingPoint): Promise<RallyingPoint[]>;
  getRecentLocations(): Promise<RallyingPoint[]>;
  cacheRecentPlaceLocation(rallyingPoint: SearchedLocation): Promise<SearchedLocation[]>;
  getRecentPlaceLocations(): Promise<SearchedLocation[]>;
  cacheRecentTrip(trip: Trip): Promise<Trip[]>;
  getRecentTrips(): Promise<Trip[]>;
  search(
    query: string,
    closeTo?: LatLng
  ): Promise<{
    type: "FeatureCollection";
    features: Array<SearchedLocationSuggestion>;
  }>;
}

export type Trip = {
  from: RallyingPoint;
  to: RallyingPoint;
};

export const getKeyForTrip = (trip: Trip) => {
  return trip.from.id + "_" + trip.to.id;
};

const cacheSize = 5;
const rallyingPointsKey = "rallyingPoints";
const recentPlacesKey = "recent_places";
const tripsKey = "trips";
const lastKnownLocationKey = "last_known_loc";

export abstract class AbstractLocationService implements LocationService {
  private lastKnownLocation: LatLng;

  protected constructor(private env: AppEnv, private storage: AppStorage, defaultLocation: LatLng) {
    this.lastKnownLocation = defaultLocation;
    this.storage.retrieveAsync<LatLng>(lastKnownLocationKey).then(res => {
      if (res) {
        this.lastKnownLocation = res;
      }
    });
  }

  async cacheRecentLocation(rallyingPoint: RallyingPoint): Promise<RallyingPoint[]> {
    let cachedValues = (await this.storage.retrieveAsync<RallyingPoint[]>(rallyingPointsKey)) ?? [];
    cachedValues = cachedValues.filter(v => v.id !== rallyingPoint.id);
    cachedValues.unshift(rallyingPoint);
    cachedValues = cachedValues.slice(0, cacheSize);
    await this.storage.storeAsync<RallyingPoint[]>(rallyingPointsKey, cachedValues);

    return cachedValues;
  }

  async getRecentLocations(): Promise<RallyingPoint[]> {
    return (await this.storage.retrieveAsync<RallyingPoint[]>(rallyingPointsKey)) ?? [];
  }

  async cacheRecentPlaceLocation(p: SearchedLocation): Promise<SearchedLocation[]> {
    let cachedValues = (await this.storage.retrieveAsync<SearchedLocation[]>(recentPlacesKey)) ?? [];
    cachedValues = cachedValues.filter(
      v =>
        (isRallyingPointSearchedLocation(v) ? v.properties!.id : v.properties!.ref) !==
        (isRallyingPointSearchedLocation(p) ? p.properties!.id : p.properties!.ref)
    );
    cachedValues.unshift(p);
    cachedValues = cachedValues.slice(0, cacheSize);
    await this.storage.storeAsync<SearchedLocation[]>(recentPlacesKey, cachedValues);

    return cachedValues;
  }

  async getRecentPlaceLocations(): Promise<SearchedLocation[]> {
    return (await this.storage.retrieveAsync<SearchedLocation[]>(recentPlacesKey)) ?? [];
  }

  async cacheRecentTrip(trip: Trip): Promise<Trip[]> {
    let cachedValues = (await this.storage.retrieveAsync<Trip[]>(tripsKey)) ?? [];
    cachedValues = cachedValues.filter(v => getKeyForTrip(v) !== getKeyForTrip(trip));
    cachedValues.unshift(trip);
    cachedValues = cachedValues.slice(0, cacheSize);
    await this.storage.storeAsync<Trip[]>(tripsKey, cachedValues);

    return cachedValues;
  }

  async getRecentTrips(): Promise<Trip[]> {
    return (await this.storage.retrieveAsync<Trip[]>(tripsKey)) ?? [];
  }

  getLastKnownLocation(): LatLng {
    return this.lastKnownLocation;
  }

  async search(
    query: string,
    closeTo?: LatLng
  ): Promise<{
    type: "FeatureCollection";
    features: Array<SearchedLocationSuggestion>;
  }> {
    let url = `https://api.maptiler.com/geocoding/${query}.json`;

    const types = [
      "joint_municipality",
      "joint_submunicipality",
      "municipality",
      "municipal_district",
      "locality",
      "neighbourhood",
      "place",
      "postal_code",
      "address",
      "poi"
    ];

    url += `?key=${this.env.raw.MAPTILER_KEY}`;
    url += `&country=${["fr"]}`;
    url += `&language=${["fr"]}`;
    url += `&types=${types}`;
    if (closeTo) {
      url += `&proximity=${[closeTo.lng, closeTo.lat]}`;
    }

    const response = await fetch(url, {
      method: "GET"
    });
    if (response.status === 200) {
      return response.json();
    } else {
      throw new Error("API returned error " + response.status);
    }
  }

  currentLocation = async (): Promise<LatLng> => {
    this.lastKnownLocation = await this.currentLocationImpl();
    await this.storage.storeAsync<LatLng>(lastKnownLocationKey, this.lastKnownLocation);
    return this.lastKnownLocation;
  };

  abstract currentLocationImpl(): Promise<LatLng>;
}

export const DEFAULT_TLS = {
  lat: 43.602173,
  lng: 1.445083
};

export const FR_BBOX: BoundingBox = {
  from: { lat: 41.172856, lng: -5.818786 },
  to: { lat: 51.577228, lng: 10.331117 }
};

export const getMapStyleUrl = (env: AppEnv) => "https://api.maptiler.com/maps/streets-v2/style.json?key=" + env.raw.MAPTILER_KEY;
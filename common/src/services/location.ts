import { LatLng, RallyingPoint } from "../api";
import { AppStorage } from "../storage";
import { AppEnv } from "../env";
import { Feature, Geometry, Point } from "geojson";
import { BoundingBox } from "../util";
import { HttpClient } from "./http";
import { MemberPing } from "../event";
import { isResourceNotFound, isValidationError } from "../exception";

export type SearchedLocation = RallyingPointSearchedLocation | SearchedLocationSuggestion;
export type RallyingPointSearchedLocation = Feature<Point, RallyingPoint> & { place_type: ["rallying_point"] };
export type SearchedLocationSuggestion = {
  place_type_name: string[] | undefined;
  place_name: string;
  place_type: string[];
  text: string;
  text_fr: string;
  context: Array<{ id: string; text: string; text_fr: string }>;
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
  cacheRecentTrip(trip: Itinerary): Promise<Itinerary[]>;
  getRecentTrips(): Promise<Itinerary[]>;
  search(
    query: string,
    closeTo?: LatLng
  ): Promise<{
    type: "FeatureCollection";
    features: Array<SearchedLocationSuggestion>;
  }>;
  name(location: LatLng): Promise<{
    type: "FeatureCollection";
    features: Array<SearchedLocationSuggestion>;
  }>;
  postPing(ping: MemberPing, timestamp?: number): Promise<void>;
}

export type Itinerary = {
  from: RallyingPoint;
  to: RallyingPoint;
};

export const getKeyForTrip = (trip: Itinerary) => {
  return trip.from.id + "_" + trip.to.id;
};

const cacheSize = 5;
const rallyingPointsKey = "rallyingPoints";
const recentPlacesKey = "recent_places";
const tripsKey = "trips";
const lastKnownLocationKey = "last_known_loc";

export abstract class AbstractLocationService implements LocationService {
  private lastKnownLocation: LatLng;

  protected constructor(
    private env: AppEnv,
    private storage: AppStorage,
    private http: HttpClient,
    defaultLocation: LatLng
  ) {
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

  async cacheRecentTrip(trip: Itinerary): Promise<Itinerary[]> {
    let cachedValues = (await this.storage.retrieveAsync<Itinerary[]>(tripsKey)) ?? [];
    cachedValues = cachedValues.filter(v => getKeyForTrip(v) !== getKeyForTrip(trip));
    cachedValues.unshift(trip);
    cachedValues = cachedValues.slice(0, cacheSize);
    await this.storage.storeAsync<Itinerary[]>(tripsKey, cachedValues);

    return cachedValues;
  }

  async getRecentTrips(): Promise<Itinerary[]> {
    return (await this.storage.retrieveAsync<Itinerary[]>(tripsKey)) ?? [];
  }

  getLastKnownLocation(): LatLng {
    return this.lastKnownLocation;
  }

  async name(location: LatLng): Promise<{
    type: "FeatureCollection";
    features: Array<SearchedLocationSuggestion>;
  }> {
    let url = `https://api.maptiler.com/geocoding/${location.lng},${location.lat}.json`;
    url += `?key=${this.env.raw.MAPTILER_KEY}`;
    url += `&language=${["fr"]}`;
    url += `&limit=1`;

    const types = ["address", "poi"];
    url += `&types=${types}`;
    const response = await fetch(url, {
      method: "GET"
    });
    if (response.status === 200) {
      return response.json();
    } else {
      throw new Error("API returned error " + response.status);
    }
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

  postPing = async (ping: MemberPing, timestamp?: number): Promise<void> => {
    await this.http.postAs(`/event/member_ping`, { body: { ...ping, timestamp: timestamp || ping.timestamp } }).catch(err => {
      if (isResourceNotFound(err) || isValidationError(err)) {
        throw new Error("API returned error " + err);
      }
    });
  };

  abstract currentLocationImpl(): Promise<LatLng>;
}

export const DEFAULT_TLS = {
  lat: 43.602173,
  lng: 1.445083
};

export const FR_BBOX: BoundingBox = {
  min: { lat: 41.172856, lng: -5.818786 },
  max: { lat: 51.577228, lng: 10.331117 }
};

export const getMapStyleUrl = (env: AppEnv) => "https://api.maptiler.com/maps/streets-v2/style.json?key=" + env.raw.MAPTILER_KEY;

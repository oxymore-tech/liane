import { LatLng, RallyingPoint } from "@/api";
import { retrieveAsync, storeAsync } from "@/api/storage";
import { DEFAULT_TLS } from "@/api/location";
import { MAPTILER_KEY } from "@env";
import { Feature, Geometry, Point } from "geojson";
import BackgroundGeolocationService from "native-modules/geolocation";
import GetLocation from "react-native-get-location";

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

export class LocationServiceClient implements LocationService {
  // Default location
  private lastKnownLocation = DEFAULT_TLS;

  constructor() {
    retrieveAsync<LatLng>(lastKnownLocationKey).then(res => {
      if (res) {
        this.lastKnownLocation = res;
      }
    });
  }

  async cacheRecentLocation(rallyingPoint: RallyingPoint): Promise<RallyingPoint[]> {
    let cachedValues = (await retrieveAsync<RallyingPoint[]>(rallyingPointsKey)) ?? [];
    cachedValues = cachedValues.filter(v => v.id !== rallyingPoint.id);
    cachedValues.unshift(rallyingPoint);
    cachedValues = cachedValues.slice(0, cacheSize);
    await storeAsync<RallyingPoint[]>(rallyingPointsKey, cachedValues);

    return cachedValues;
  }

  async getRecentLocations(): Promise<RallyingPoint[]> {
    return (await retrieveAsync<RallyingPoint[]>(rallyingPointsKey)) ?? [];
  }

  async cacheRecentPlaceLocation(p: SearchedLocation): Promise<SearchedLocation[]> {
    let cachedValues = (await retrieveAsync<SearchedLocation[]>(recentPlacesKey)) ?? [];
    cachedValues = cachedValues.filter(
      v =>
        (isRallyingPointSearchedLocation(v) ? v.properties!.id : v.properties!.ref) !==
        (isRallyingPointSearchedLocation(p) ? p.properties!.id : p.properties!.ref)
    );
    cachedValues.unshift(p);
    cachedValues = cachedValues.slice(0, cacheSize);
    await storeAsync<SearchedLocation[]>(recentPlacesKey, cachedValues);

    return cachedValues;
  }

  async getRecentPlaceLocations(): Promise<SearchedLocation[]> {
    return (await retrieveAsync<SearchedLocation[]>(recentPlacesKey)) ?? [];
  }

  async cacheRecentTrip(trip: Trip): Promise<Trip[]> {
    let cachedValues = (await retrieveAsync<Trip[]>(tripsKey)) ?? [];
    cachedValues = cachedValues.filter(v => getKeyForTrip(v) !== getKeyForTrip(trip));
    cachedValues.unshift(trip);
    cachedValues = cachedValues.slice(0, cacheSize);
    await storeAsync<Trip[]>(tripsKey, cachedValues);

    return cachedValues;
  }

  async getRecentTrips(): Promise<Trip[]> {
    return (await retrieveAsync<Trip[]>(tripsKey)) ?? [];
  }

  currentLocation = async () => {
    const loc = await GetLocation.getCurrentPosition({ timeout: 8000, enableHighAccuracy: true });
    this.lastKnownLocation = { lat: loc.latitude, lng: loc.longitude };
    await storeAsync<LatLng>(lastKnownLocationKey, this.lastKnownLocation);
    return this.lastKnownLocation;
  };

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

    url += `?key=${MAPTILER_KEY}`;
    url += `&country=${["fr"]}`;
    url += `&language=${["fr"]}`;
    url += `&types=${types}`;
    if (closeTo) {
      url += `&proximity=${[closeTo.lng, closeTo.lat]}`;
    }

    //console.log(url);
    const response = await fetch(url, {
      method: "GET"
    });
    if (response.status === 200) {
      return response.json();
    } else {
      throw new Error("API returned error " + response.status);
    }
  }
}

export type SearchedLocation = RallyingPointSearchedLocation | SearchedLocationSuggestion;
export type RallyingPointSearchedLocation = Feature<Point, RallyingPoint> & { place_type: ["rallying_point"] };
export type SearchedLocationSuggestion = Readonly<
  {
    place_type_name: string[] | undefined;
    place_name: string;
    place_type: string[];
    context: Array<{ text: string }>;
  } & Feature<Geometry, { ref: string; categories: string[] }>
>;
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

export const LianeGeolocation = BackgroundGeolocationService;

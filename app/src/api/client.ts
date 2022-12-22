import { del, get, post, postAs } from "./http";
import {
  AuthResponse, LatLng, RallyingPoint, TripIntent, TripIntentMatch
} from "@/api";

export function me(): Promise<AuthResponse> {
  return get("/auth/me");
}

export async function login(phone: string, code: string): Promise<AuthResponse> {
  return postAs("/auth/login", { params: { phone, code } });
}

export async function sendSms(phone: string) {
  return post("/auth/sms", { params: { phone } });
}

export async function getRallyingPoint(id: string): Promise<RallyingPoint> {
  return get(`/rallying_point/${id}`);
}

export async function getRallyingPoints(search: string, location?: LatLng): Promise<RallyingPoint[]> {
  return get("/rallying_point", { params: { search, lng: location?.lng, lat: location?.lat } });
}

export async function sendTripIntent(tripIntent: Partial<TripIntent>): Promise<TripIntent> {
  return postAs<TripIntent>("/trip_intent", { body: tripIntent });
}

export async function getTripIntents(): Promise<TripIntent[]> {
  return get("/trip_intent");
}

export async function deleteTripIntent(id: string) {
  return del(`/trip_intent/${id}`);
}

export async function getMatches(): Promise<TripIntentMatch[]> {
  return get("/trip_intent/match");
}

import {get, post, postAs, remove} from "@/api/http";
import {
  AuthUser, UserLocation, Notification, Liane, RallyingPoint, LatLng, TripIntent, TripFilterOptions, RoutedLiane
} from "@/api";

export async function logLocation(locations: UserLocation[]) {
  await post("/location", { body: locations });
}

export function listTrips(): Promise<Liane[]> {
  return get("/liane/get");
}

export function me(): Promise<AuthUser> {
  return get("/auth/me");
}

export async function login(phone: string, code: string, token?: string): Promise<AuthUser> {
  return postAs("/auth/login", { params: { phone, code, token } });
}

export async function sendSms(phone: string) {
  return post("/auth/sms", { params: { phone } });
}

export async function getNotifications(): Promise<Notification[]> {
  return get("/notification");
}

export async function deleteNotification(notificationTimestamp: number) {
  return post("/auth/notification/delete", { params: { date: notificationTimestamp } });
}

export async function getRallyingPoints(name: string, location?: LatLng): Promise<RallyingPoint[]> {
  return get("/rallying_point", { params: { search: name, lng: location?.lng, lat: location?.lat } });
}

export async function sendTripIntent(tripIntent: TripIntent) {
  return post("/trip_intent", { body: tripIntent });
}

export async function snapLianes(filter: TripFilterOptions): Promise<RoutedLiane[]> {
  return postAs("/liane/snap", { body: filter });
}

export async function getTripIntents(): Promise<TripIntent[]> {
  return get("/trip_intent");
}

export async function deleteTripIntent(id: string) {
  return remove(`/trip_intent/${id}`);
}
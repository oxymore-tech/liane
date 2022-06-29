import {get, post, postAs, QueryAsOptions} from "@/api/http";
import {AuthUser, UserLocation, Notification, Liane, AddressResponse, RallyingPoint, LatLng} from "@/api";

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
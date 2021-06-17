import { get, post, postAs } from "@/api/http";
import { AuthUser, LocationWithInformation, Notification, RealTrip } from "@/api";

export async function logLocation(locations: LocationWithInformation[]) {
  await post("/location", { body: locations });
}

export function listTrips(): Promise<RealTrip[]> {
  return get("/trip");
}

export function me(): Promise<AuthUser> {
  return get("/auth/me");
}

export async function login(phone: string, code: string, token: string): Promise<AuthUser> {
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
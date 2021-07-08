import { get, post, postAs } from "@/api/http";
import { AuthUser, UserLocation, Notification, LianeTrip } from "@/api";

export async function logLocation(locations: UserLocation[]) {
  await post("/location", { body: locations });
}

export function listTrips(): Promise<LianeTrip[]> {
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
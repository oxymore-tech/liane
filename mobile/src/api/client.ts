import { LocationObject } from "expo-location";
import { get, post, postAs } from "@api/http";
import { AuthUser } from "@/api";

export async function sendLocation(location: LocationObject) {
  const { accuracy } = location.coords;
  const accuracyInteger = accuracy ? Number.parseInt(Math.round(accuracy).toString(), 10) : 0;
  const body = [{
    coords: {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: accuracyInteger,
      speed: location.coords.speed
    },
    timestamp: location.timestamp
  }];
  await post("/location", { body });
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

export async function getNotifications() {
  return get("/notification");
}

export async function deleteNotification(notificationTimestamp: number) {
  return post("/auth/notification/delete", { params: { date: notificationTimestamp } });
}
import { del, get, post, postAs } from "@/api/http";
import { AuthResponse } from "@/api";

export function me(): Promise<AuthResponse> {
  return get("/auth/me");
}

export async function login(phone: string, code: string): Promise<AuthResponse> {
  return postAs("/auth/login", { params: { phone, code } });
}

export async function sendSms(phone: string) {
  return post("/auth/sms", { params: { phone } });
}

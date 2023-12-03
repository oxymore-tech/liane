import { decode } from "base-64";

export function isTokenExpired(accessToken: string): boolean {
  if (accessToken === undefined || accessToken === null || accessToken === "") {
    return true;
  }
  const parts = accessToken.split(".");
  if (parts.length < 1) {
    return true;
  }
  try {
    const payload = JSON.parse(decode(parts[1]));
    const expiresAt = payload.exp * 1000;
    return new Date().getTime() > expiresAt;
  } catch (e) {
    return true;
  }
}

import { decode } from "base-64";

export function isTokenExpired(accessToken: string): boolean {
  const payload = JSON.parse(decode(accessToken.split(".")[1]));
  const expiresAt = payload.exp * 1000;
  return new Date().getTime() > expiresAt;
}

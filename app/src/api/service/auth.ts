import { get, post, postAs, processAuthResponse } from "@/api/http";
import { AuthResponse, AuthUser } from "@/api"; import { getStoredUser } from "@/api/storage";

export interface AuthService {
  login(phone: string, code: string): Promise<AuthResponse>;
  me(): Promise<AuthUser | undefined>;
  sendSms(phone: string): Promise<void>;
}

export class AuthServiceClient implements AuthService {

  async me(): Promise<AuthUser | undefined> {
    return getStoredUser();
  }

  async login(phone: string, code: string): Promise<AuthResponse> {
    const authResponse = await postAs<AuthResponse>("/auth/login", { params: { phone, code } });
    if (authResponse) await processAuthResponse(authResponse);
    return authResponse;
  }

  async sendSms(phone: string): Promise<any> { // TODO
    return post("/auth/sms", { params: { phone } });
  }

}

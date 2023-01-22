import { post, postAs } from "@/api/http";
import { AuthResponse, AuthUser } from "@/api";
import { clearStorage, getUserSession, processAuthResponse } from "@/api/storage";

export interface AuthService {
  login(phone: string, code: string, pushToken?: string): Promise<AuthUser>;
  me(): Promise<AuthUser | undefined>;
  sendSms(phone: string): Promise<void>;
  logout(): Promise<void>;
}

export class AuthServiceClient implements AuthService {
  async me(): Promise<AuthUser | undefined> {
    return getUserSession();
  }

  async login(phone: string, code: string, pushToken?: string): Promise<AuthUser> {
    const authResponse = await postAs<AuthResponse>("/auth/login", { params: { phone, code, pushToken } });
    await processAuthResponse(authResponse);
    return authResponse.user;
  }

  async sendSms(phone: string): Promise<any> {
    return post("/auth/sms", { params: { phone } });
  }

  async logout(): Promise<void> {
    await post("/auth/logout");
    await clearStorage();
  }
}

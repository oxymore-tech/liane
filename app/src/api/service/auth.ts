import { patch, post, postAs, postAsString } from "@/api/http";
import { AuthRequest, AuthResponse, AuthUser, FullUser, UserInfo } from "@/api";
import { clearStorage, getCurrentUser, getUserSession, processAuthResponse } from "@/api/storage";

export interface AuthService {
  login(request: AuthRequest): Promise<AuthUser>;
  authUser(): Promise<AuthUser | undefined>;
  sendSms(phone: string): Promise<void>;
  logout(): Promise<void>;
  updatePushToken(token: string): Promise<void>;
  updateUserInfo(info: UserInfo): Promise<void>;
  currentUser(): Promise<FullUser | undefined>;
  uploadProfileImage(data: FormData): Promise<string>;
}

export class AuthServiceClient implements AuthService {
  async authUser(): Promise<AuthUser | undefined> {
    return getUserSession();
  }

  async currentUser(): Promise<FullUser | undefined> {
    return getCurrentUser();
  }

  async login(request: AuthRequest): Promise<AuthUser> {
    const authResponse = await postAs<AuthResponse>("/auth/login", { body: request });
    await processAuthResponse(authResponse);
    return authResponse.user;
  }

  async sendSms(phone: string): Promise<void> {
    await post("/auth/sms", { params: { phone } });
  }

  async logout(): Promise<void> {
    await post("/auth/logout");
    await clearStorage();
  }

  async updatePushToken(token: string): Promise<void> {
    await patch("/user/push_token", { body: token });
  }

  async updateUserInfo(info: UserInfo): Promise<void> {
    await patch("/user", { body: info });
  }

  uploadProfileImage(data: FormData): Promise<string> {
    return postAsString("/image/profile", { body: data });
  }
}

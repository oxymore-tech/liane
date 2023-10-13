import { AuthRequest, AuthResponse, FullUser, UserInfo } from "./api";
import { HttpClient } from "./http";

export interface AuthService {
  me(): Promise<FullUser | undefined>;
  login(request: AuthRequest): Promise<AuthResponse>;
  sendSms(phone: string): Promise<void>;
  logout(): Promise<void>;
  updatePushToken(token: string): Promise<void>;
  updateUserInfo(info: UserInfo): Promise<FullUser>;
  uploadProfileImage(data: FormData): Promise<string>;
  deleteAccount(): Promise<void>;
}

export class AuthServiceClient implements AuthService {
  constructor(private http: HttpClient) {}

  async me(): Promise<FullUser | undefined> {
    try {
      return await this.http.get<FullUser>("/user");
    } catch (_) {
      return;
    }
  }

  async login(request: AuthRequest): Promise<AuthResponse> {
    return await this.http.postAs<AuthResponse>("/auth/login", { body: request });
  }

  async sendSms(phone: string): Promise<void> {
    await this.http.post("/auth/sms", { params: { phone } });
  }

  async logout(): Promise<void> {
    await this.http.post("/auth/logout");
  }

  async deleteAccount(): Promise<void> {
    await this.http.del("/user");
  }

  async updatePushToken(token: string): Promise<void> {
    await this.http.patch("/user/push_token", { body: token });
  }

  async updateUserInfo(info: UserInfo) {
    return await this.http.patchAs<FullUser>("/user", { body: info });
  }

  async uploadProfileImage(data: FormData) {
    return await this.http.postAsString("/image/profile", { body: data });
  }
}

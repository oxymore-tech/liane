import { AuthRequest, AuthResponse, AuthUser, FullUser, UserInfo } from "../api";
import { HttpClient } from "./http";
import { AppStorage } from "../storage";
import { UnauthorizedError } from "../exception";

export interface AuthService {
  me(): Promise<FullUser | undefined>;
  login(request: AuthRequest): Promise<AuthUser>;
  sendSms(phone: string): Promise<void>;
  logout(): Promise<void>;
  updatePushToken(token: string): Promise<void>;
  updateUserInfo(info: UserInfo): Promise<FullUser>;
  uploadProfileImage(data: FormData): Promise<string>;
  deleteAccount(): Promise<void>;
}

export class AuthServiceClient implements AuthService {
  constructor(
    private http: HttpClient,
    private storage: AppStorage
  ) {}

  async me(): Promise<FullUser | undefined> {
    try {
      const user = await this.http.get<FullUser>("/user");
      await this.storage.storeUser(user);
      return user;
    } catch (e) {
      if (e instanceof UnauthorizedError) return undefined;
      throw e;
    }
  }

  async login(request: AuthRequest): Promise<AuthUser> {
    const authResponse = await this.http.postAs<AuthResponse>("/auth/login", { body: request });
    await this.storage.processAuthResponse(authResponse);
    return authResponse.user;
  }

  async sendSms(phone: string): Promise<void> {
    await this.http.post("/auth/sms", { params: { phone } });
  }

  async logout(): Promise<void> {
    await this.http.post("/auth/logout");
    await this.storage.clearStorage();
  }

  async deleteAccount(): Promise<void> {
    await this.http.del("/user");
    await this.storage.clearStorage();
  }

  async updatePushToken(token: string): Promise<void> {
    await this.http.patch("/user/push_token", { body: token });
  }

  async updateUserInfo(info: UserInfo) {
    const user = await this.http.patchAs<FullUser>("/user", { body: info });
    await this.storage.storeUser(user);
    return user;
  }

  async uploadProfileImage(data: FormData) {
    const pictureUrl = await this.http.postAsString("/image/profile", { body: data });
    const currentUser = await this.storage.getUser();
    const updatedUserData = { ...currentUser!, pictureUrl };
    await this.storage.storeUser(updatedUserData);
    return pictureUrl;
  }
}

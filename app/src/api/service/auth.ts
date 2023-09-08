import { del, patch, patchAs, post, postAs, postAsString } from "@/api/http";
import { AuthRequest, AuthResponse, AuthUser, FullUser, UserInfo } from "@/api";
import { clearStorage, getCurrentUser, getUserSession, processAuthResponse, storeCurrentUser } from "@/api/storage";
import { Subject, SubscriptionLike } from "rxjs";

export interface AuthService {
  login(request: AuthRequest): Promise<AuthUser>;
  authUser(): Promise<AuthUser | undefined>;
  sendSms(phone: string): Promise<void>;
  logout(): Promise<void>;
  updatePushToken(token: string): Promise<void>;
  updateUserInfo(info: UserInfo): Promise<FullUser>;
  currentUser(): Promise<FullUser | undefined>;
  uploadProfileImage(data: FormData): Promise<string>;
  subscribeToUserChanges(callback: (user: FullUser) => void): SubscriptionLike;
  deleteAccount(): Promise<void>;
}

export class AuthServiceClient implements AuthService {
  private userSubject = new Subject<FullUser>();
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

  async deleteAccount(): Promise<void> {
    await del("/user");
    await clearStorage();
  }

  async updatePushToken(token: string): Promise<void> {
    await patch("/user/push_token", { body: token });
  }

  updateUserInfo = async (info: UserInfo) => {
    const user = await patchAs<FullUser>("/user", { body: info });
    await storeCurrentUser(user);
    this.userSubject.next(user);
    return user;
  };

  uploadProfileImage = async (data: FormData) => {
    const pictureUrl = await postAsString("/image/profile", { body: data });
    const currentUser = await getCurrentUser();
    const updatedUserData = { ...currentUser!, pictureUrl };
    await storeCurrentUser(updatedUserData);
    this.userSubject.next(updatedUserData);
    return pictureUrl;
  };

  subscribeToUserChanges = (callback: (user: FullUser) => void) => {
    return this.userSubject.subscribe(callback);
  };
}

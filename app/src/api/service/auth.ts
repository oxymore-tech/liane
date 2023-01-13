import { post, postAs } from "@/api/http";
import { AuthResponse, AuthUser } from "@/api"; import {
  clearStorage,
  getStoredUser, processAuthResponse, setStoredRefreshToken, setStoredToken, setStoredUser, StoredUser
} from "@/api/storage"; import { Observable } from "@/util/observer";

export interface AuthService {
  login(phone: string, code: string): Promise<AuthResponse>;
  me(): Promise<Observable<AuthUser | undefined>>;
  sendSms(phone: string): Promise<void>;
  logout(): Promise<void>;
}

export class AuthServiceClient implements AuthService {

  async me(): Promise<Observable<AuthUser | undefined>> {
    const user = await getStoredUser();
    StoredUser.update(user);
    return StoredUser;
  }

  async login(phone: string, code: string): Promise<AuthResponse> {
    const authResponse = await postAs<AuthResponse>("/auth/login", { params: { phone, code } });
    if (authResponse) await processAuthResponse(authResponse);
    return authResponse;
  }

  async sendSms(phone: string): Promise<any> { // TODO
    return post("/auth/sms", { params: { phone } });
  }

  async logout(): Promise<void> {
    await post("/auth/logout");
    await clearStorage();
  }

}

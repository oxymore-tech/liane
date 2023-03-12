import { AuthRequest, AuthUser } from "@/api";
import { AuthService } from "@/api/service/auth";
import { clearStorage, processAuthResponse } from "@/api/storage";

export class AuthServiceMock implements AuthService {
  readonly mockUser = {
    id: "00000",
    phone: "0600000000",
    isAdmin: false
  };

  async authUser(): Promise<AuthUser | undefined> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return this.mockUser;
  }

  async login(request: AuthRequest): Promise<AuthUser> {
    await new Promise(resolve => setTimeout(resolve, 500));
    await processAuthResponse({ user: this.mockUser, token: { refreshToken: "TOKEN", accessToken: "TOKEN" } });
    return this.mockUser;
  }

  async sendSms(phone: string): Promise<void> {
    // TODO
  }

  async logout(): Promise<void> {
    await clearStorage();
  }
}

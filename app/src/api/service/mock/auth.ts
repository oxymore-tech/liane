import { AuthResponse, AuthUser } from "@/api";
import { AuthService } from "@/api/service/auth";

export class AuthServiceMock implements AuthService {

  readonly mockUser = {
    id: "00000",
    phone: "0600000000",
    isAdmin: false
  };

  async me(): Promise<AuthUser | undefined> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return this.mockUser;
  }

  async login(phone: string, code: string): Promise<AuthResponse> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { user: this.mockUser, token: { refreshToken: "", accessToken: "", expiresInMilli: 9999 } };
  }

  async sendSms(phone: string): Promise<any> { // TODO

  }

}
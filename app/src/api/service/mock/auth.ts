import { AuthResponse } from "@/api";
import { AuthService } from "@/api/service/auth";

export class AuthServiceMock implements AuthService {

  readonly mockUser = {
    user: {
      id: "00000",
      phone: "0600000000",
      isAdmin: false
    },
    token: "MOCK_TOKEN"
  };

  async me(): Promise<AuthResponse> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return this.mockUser;
  }

  async login(phone: string, code: string): Promise<AuthResponse> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return this.mockUser;
  }

  async sendSms(phone: string): Promise<any> { // TODO

  }

}
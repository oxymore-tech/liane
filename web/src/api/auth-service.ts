import { get, post, postAs } from "@/api/http";
import { AuthUser } from "@/api/index";

class AuthService {

  me(): Promise<AuthUser> {
    return get("/api/auth/me");
  }

  async login(phone: string, code: string, token?: string): Promise<AuthUser> {
    return postAs("/api/auth/login", { params: { phone, code, token } });
  }

  async sendSms(phone: string) {
    return post("/api/auth/sms", { params: { phone } });
  }

}

export const authService = new AuthService();

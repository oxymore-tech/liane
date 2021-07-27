import { get, post, postAs } from "@/api/http";
import { AuthUser } from "@/api/index";

export class AuthService {

  static me(): Promise<AuthUser> {
    return get("/api/auth/me");
  }

  static async login(phone: string, code: string, token?: string): Promise<AuthUser> {
    return postAs("/api/auth/login", { params: { phone, code, token } });
  }

  static async sendSms(phone: string) {
    return post("/api/auth/sms", { params: { phone } });
  }

}
